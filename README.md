# HackerFeed Web

HackerFeed is a TanStack Start app for reading Hacker News stories, saving
favorites, and browsing the latest ingested Hugging Face Daily Papers edition.
It runs on Cloudflare Workers with D1 for persistent app data.

## Stack

- TanStack Start, TanStack Router, TanStack Query, React 19
- Cloudflare Workers via `@cloudflare/vite-plugin`
- Cloudflare D1 with Drizzle ORM migrations
- tRPC for the browser-to-backend application boundary
- WorkOS AuthKit for authentication
- Sentry for browser and Worker observability
- Biome and Vitest for quality checks

## Getting Started

Install dependencies and start the local dev server:

```bash
bun install
bun run dev
```

The dev server listens on port 3000.

## Scripts

```bash
bun run dev              # Start Vite dev server on port 3000
bun run build            # Production build
bun run preview          # Preview the production build locally
gh workflow run deploy.yaml  # Deploy with Terraform outputs in CI
bun run test             # Run Vitest
bun run lint             # Run Biome lint
bun run format           # Run Biome format
bun run check            # Run Biome lint and format checks
bun run security:audit   # Audit dependencies at high severity and above
```

## Environment

Application environment variables are validated in `src/env.ts`. Cloudflare
bindings and production defaults live in `wrangler.jsonc`.

For local development, put public Vite values in `.env.local` and Worker-only
secrets in `.dev.vars`:

```bash
# .env.local
VITE_WORKOS_CLIENT_ID=...
VITE_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_WORKOS_API_HOSTNAME=api.workos.com
VITE_APP_TITLE=Hacker Feed
VITE_SENTRY_DSN=...
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# .dev.vars
AI_TOKEN_ENCRYPTION_KEY=... # at least 32 characters
SENTRY_DSN=...
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SERVER_URL=http://localhost:3000
```

`VITE_SENTRY_DSN` is a build-time browser value. `SENTRY_DSN` is read by the
Worker at runtime. Production deploys upload the required secrets in
`.github/workflows/deploy.yaml`.

After changing Cloudflare bindings or variables, regenerate Worker types:

```bash
bun run cf:typegen
```

## Database

Persistent data uses Cloudflare D1 through the `DB` binding in `wrangler.jsonc`.
Tables are defined in `src/server/database/schema.ts`, SQL migrations live in
`migrations/`, and Wrangler applies them.

```bash
# After changing the Drizzle schema
bun run db:generate --name descriptive_migration_name

# Apply generated migrations
bun run db:migrate:local
gh workflow run deploy.yaml
```

The Worker creates one typed `DatabaseContext` from its D1 binding. tRPC
contexts, services, and repositories receive that Drizzle context; application
code must not access `env.DB` directly outside the Worker boundary.

## Activity analytics

Each action below is a row in the D1 `activity_events` table: who
(`appUserId`), what (`action`), which story or paper (`storyId` or `paperId`),
and when (`occurredAt`, UTC).

| `action` | Logged when the user |
| --- | --- |
| `story.read` | opens a story: its article, or the HN post when it has no article (Ask HN) |
| `story.discussion_opened` | opens the in-app comment thread from a story card |
| `story.chat_opened` | opens the AI chat for a story |
| `story.favorited` / `story.unfavorited` | saves or removes a story (clearing logs one unfavorite per story) |
| `paper.read` | opens a paper |
| `paper.chat_opened` | opens a paper's ChatGPT discussion |
| `paper.favorited` / `paper.unfavorited` | saves or removes a paper |

Favorite events are written in the same D1 batch as the favorite itself, and
only when something changed. Opens are reported by the browser without blocking
the link, so a dropped request loses an event instead of slowing the user down.
Importing favorites from an older local session is not logged.

Query production with `wrangler d1 execute hackerfeed --remote --command "…"`
or the D1 console in the Cloudflare dashboard:

```sql
-- Actions per day
SELECT date(occurredAt) AS day, action, count(*) AS events
FROM activity_events GROUP BY day, action ORDER BY day DESC, events DESC;

-- Most-read stories this week
SELECT s.title, count(*) AS reads
FROM activity_events e JOIN stories s ON s.id = e.storyId
WHERE e.action = 'story.read' AND e.occurredAt >= datetime('now', '-7 days')
GROUP BY s.id ORDER BY reads DESC LIMIT 20;
```

To log a new action, add it to `activityActions` in
`src/server/database/schema.ts`. No migration is needed. Story actions must
start with `story.` and set `storyId`, and paper actions must start with
`paper.` and set `paperId`. A CHECK constraint enforces the prefix and the
matching column.

## Infrastructure

`infra/terraform` creates the Cloudflare resources the app runs on: today, the
D1 database and CI's Cloudflare tokens. It creates resources and nothing else. Wrangler deploys the
Worker and its settings from `wrangler.jsonc`, and CI applies `migrations/` in
its own step.

Terraform owns the production database `hackerfeed` in the `prod` state. The
import block adopts the existing database on the first apply. Its UUID appears
only there for bootstrap. CI reconciles it on every production run, reads
`database_id` and `database_name`, and passes them to the build as
`D1_DATABASE_ID` and `D1_DATABASE_NAME`. `vite.config.ts` writes them into the
`DB` binding of the generated `dist/server/wrangler.json`, which migrations and
deployment both use.
The checked-in Wrangler binding uses `local-hackerfeed` for local development;
it is not a remote database identity. Run remote migrations through CI.

PR previews are static fixture demos uploaded as versions of `hackerfeed-web`
using `wrangler.preview.jsonc`, without deploying them. Branch aliases and
immutable commit URLs are reported on the PR. Because those uploads are newer
than the last release, roll back from the dashboard's deployment list or with
`wrangler rollback <version-id>`: a bare `wrangler rollback` targets the
previous upload, which may be a PR demo. Every browser page gets a fixed demo session; favorites
and views reset on refresh. No D1, WorkOS, AI connections, or production secrets
are used. Previews do not validate migrations or backend behavior. Run
`bun run dev:demo` locally, or see [private previews](docs/private-preview.md).

### Cloudflare tokens

GitHub stores one Cloudflare token, `CLOUDFLARE_API_TOKEN` in the `production`
environment. It runs Terraform and deploys the state server, which Terraform
needs first. Terraform mints, scopes and rotates every other token:

| Token | Root and state | Used by |
|---|---|---|
| `hackerfeed-ci-deploy` | `infra/terraform/deploy`, `deploy` | migrations and Worker deploys |
| `hackerfeed-ci-preview` | `infra/terraform`, `prod` | PR version uploads and PR plans |

Jobs read them from Terraform outputs with `infra/cloudflare-token.sh`, so the
`preview` environment holds no Cloudflare token. Token values sit in plain text
in state, and PR jobs can read `prod`; production-only tokens go in `deploy`,
which only `production` can read. See
[Cloudflare CI tokens](docs/cloudflare-ci-deploy-token.md).

Old preview databases and their state are left untouched. Retiring those live
resources is a separate operation; this change removes automatic creation and
cleanup. PRs also show a read-only production Terraform plan.

### State and sign-in

Terraform state lives in `infra/state-backend`, a small Worker on the free plan
(`hackerfeed-terraform-state`) that stores state and locks in its own D1
database. There is no stored password: each CI job requests a GitHub OIDC
token, and the Worker verifies it against GitHub's keys and this repository's
id. The job's GitHub environment decides what it may touch:

| Environment | `prod` state | `deploy` state |
|---|---|---|
| `production` (master only) | read, write, lock | read, write, lock |
| `preview` (pull requests) | read only, for PR plans | none |

Every Terraform command goes through `infra/terraform.sh`. A Python 3 loopback
proxy requests and refreshes OIDC credentials while Terraform runs, so a long
apply can still save state and release its lock. Each invocation has its own
port and password; the proxy forwards only that stage to the fixed state
server. GitHub only issues these tokens inside Actions, so Terraform runs in
CI, not locally; use **Run workflow** on the deploy workflow for a manual apply.
Each production run deploys the state server with wrangler before running
Terraform. Its D1 database was created once with
`wrangler d1 create hackerfeed-terraform-state`.

The proxy owns HTTP retries: normally it makes up to three attempts with 1s/2s
backoff, with a 60s total deadline per attempt. Terraform's separate HTTP retry
loop is disabled. On step cancellation the proxy stops retries and shares a 3s
network budget across state and OIDC requests, including requests already in
flight. Terraform receives only one termination signal, allowing it to write
`errored.tfstate` when remote persistence fails; the wrapper then encrypts that
file locally before exiting. An abandoned request has an unknown remote outcome,
so the proxy refuses further requests, including unlock. Reconcile the remote
state and retained lock before recovering or running another apply.

CI attempts to upload encrypted recovery files as an Actions artifact with one
day retention, including after cancellation. Upload is not guaranteed on a
cancelled job or runner loss; the bounded network wait protects local recovery,
not artifact delivery. Providers must also finish graceful cancellation in time
for state export and encryption before the runner's hard kill (normally 10s
after the first signal). A hung provider, disk/encryption failure, or abrupt
runner loss can still prevent recovery. Encryption uses OpenSSL
AES-256-CBC with PBKDF2 and a separate HMAC-SHA256 check. The key is the job's
existing `CLOUDFLARE_API_TOKEN`, so retain that credential until recovery is done.
Download both `.enc` and `.hmac` files promptly. In a secure environment with the
original credential set, run
`python3 infra/recovery_state.py <file.tfstate.enc> <recovered.tfstate>`. Recover
remote state through an authorized CI job before applying again. Do not paste
state into logs, comments, or issues. Local regression tests run with
`python3 -m unittest discover -s infra/tests -p 'test_*.py' -v` and
`bun test infra/tests/state-backend.test.js`; they do not write live
infrastructure. Put Terraform 1.13.4 on `PATH` to run the integration cases.

## AI Assistants (bring your own subscription)

Signed-in users can connect AI apps they already pay for from `/profile`, then
use **Discuss** on any story to chat about it at `/chat/<storyId>`. Replies
stream from the provider and count against the user's own plan. The story, its
post text, and a few top Hacker News comments are sent as context.

The feature is provider-agnostic:

- **`ai_providers` table:** the catalog of AI apps shown on the profile page
  (`id`, `name`, `description`, `manageUrl`, `enabled`, `sortOrder`). It's
  seeded with one row, `chatgpt`.
- **Adapters (`src/server/ai/providers/<id>/`):** everything protocol-specific
  (OAuth, token refresh, models, streaming) behind the `AiProviderAdapter`
  interface in `src/server/ai/types.ts`.
- **Generic core (`src/server/ai/`):** sessions, the sealed OAuth flow cookie,
  token encryption, refresh-before-expiry, disconnects, and the HTTP routes:
  - `GET /ai/:provider/connect` and `GET /ai/:provider/callback`
  - `GET /api/ai/providers`
  - `GET /api/ai/providers/:provider/models`
  - `POST /api/ai/providers/:provider/disconnect`
  - `POST /api/ai/chat` (streams NDJSON)

Connections live in `ai_provider_connections`, one per user and provider. OAuth
tokens are encrypted with AES-GCM before they are stored. Conversations are not
stored.

### Adding a provider

1. Implement `AiProviderAdapter` in `src/server/ai/providers/<id>/`.
2. Register it in the `adapters` list in `src/server/ai/runtime.ts`.
3. Add a row with the same `id` to `ai_providers` in a migration.

A row without an adapter is hidden. Setting `enabled` to 0 turns a provider off
without a deploy.

### Configuration

```bash
# .dev.vars (optional)
CHATGPT_CLIENT_ID=oaiapp_...         # issued by OpenAI for this deployment
CHATGPT_CLIENT_SECRET=...            # only for confidential clients
```

ChatGPT uses
[Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source/sign-in):

- **Local development:** without `CHATGPT_CLIENT_ID`, HackerFeed registers
  itself dynamically, which OpenAI only allows with an `http://127.0.0.1`
  callback. Open the app at `http://127.0.0.1:3000` (not `localhost`) and set
  `SERVER_URL=http://127.0.0.1:3000`.
- **Hosted deployments:** OpenAI must issue a client id with
  `https://<host>/ai/chatgpt/callback` registered
  ([waitlist](https://openai.com/form/sign-in-with-chatgpt-interest/)). Until
  then, the profile page shows ChatGPT as not available on this deployment.

## Hugging Face Papers

The `/papers` route serves the latest successful Hugging Face Daily Papers
edition from D1. The same Worker runs ingestion from the Cloudflare cron
configured in `wrangler.jsonc`:

```text
30 23 * * *  # 23:30 UTC / 05:00 Asia/Kolkata
```

There is intentionally no public HTTP ingestion route. Apply D1 migrations
before deploying a Worker version that enables ingestion.

Planning docs for this feature live in `docs/paper/`:

- `docs/paper/prd.md`
- `docs/paper/issue.md`
- `docs/paper/questions.md`

## Backend Boundaries

The backend currently lives inside the TanStack Start app, but it should remain
separable from the React application so it can later move to an independent API
service.

Server-only modules live under `src/server/` and must not be imported by React
UI, client hooks, or browser code. This includes database access, auth session
resolution, user and favorites services, Hugging Face Papers ingestion, and
tRPC context/router/handler modules.

React UI and hooks communicate with backend behavior through the tRPC client.
Shared schemas that are safe for both client and server imports live outside
`src/server/`, such as `src/lib/favorites/schemas.ts` and
`src/lib/papers/schemas.ts`.

tRPC is the current application boundary. Route handlers adapt HTTP/tRPC
requests to backend services; durable domain behavior belongs in services, and
database details belong in repositories.

Story freshness is refresh-on-favorite for this rollout. Stale-on-read story
refresh is intentionally deferred.

## Observability

Sentry tracing and structured logs are enabled in both the browser and the
Cloudflare Worker. Incoming requests, outgoing HTTP calls, tRPC procedures, and
D1 queries are recorded as spans in the same trace. Application `logger` calls
are attached to the active trace so the events leading to an error can be
inspected alongside it.

Sentry ingests warning and error logs. Trace volume is controlled by
`SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_TRACES_SAMPLE_RATE`; both default to
`0.1`, while error events are captured independently of trace sampling.

Production builds upload browser and Worker source maps to Sentry when
`SENTRY_AUTH_TOKEN` (a Sentry organization token, stored as a GitHub secret) is
set, then delete the `.map` files so they are never deployed. Each deploy is
tagged with its commit SHA as the Sentry release (`SENTRY_RELEASE`). Builds
without the token skip source maps.

## Routing

Routes live in `src/routes/`. `src/routeTree.gen.ts` is generated by the
TanStack Router Vite plugin and should not be edited manually. Add routes by
creating files in `src/routes/`; the plugin regenerates the tree on the next dev
server restart or build.

## Styling

Styling uses Tailwind CSS in `src/styles.css`.
