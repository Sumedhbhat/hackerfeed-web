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
- Nx and Bun workspaces for project boundaries and dependency-aware checks

## Getting Started

Install dependencies and start the local dev server:

```bash
bun install
bun run dev
```

The dev server listens on port 3000.

## Workspace

The repository is an Nx workspace of Bun workspace packages. HackerFeed is
still one deployed Worker; the packages give each part a public interface and
its own checks.

| Project | Path | What it holds |
|---|---|---|
| `web` | `apps/web` | The TanStack Start host: routes, pages, hooks, demo data, Vite and Wrangler config |
| `ui` | `packages/ui` | Atoms, molecules and the design tokens stylesheet |
| `contracts` | `packages/contracts` | Zod request/response schemas shared by browser and Worker |
| `hacker-news` | `packages/hacker-news` | Hacker News record types and display helpers |
| `runtime` | `packages/runtime` | Logger, trace headers, Sentry data policy, HTTP client |
| `backend` | `packages/backend` | Services, repositories, the Drizzle schema, migrations and the tRPC router |
| `api-client` | `packages/api-client` | Browser transports for tRPC, AI and feature flags |
| `state-backend` | `apps/state-backend` | The Terraform state Worker |
| `infra-prod` | `infra/cloudflare-prod` | Terraform root for the `prod` state |
| `infra-deploy` | `infra/deploy-access` | Terraform root for the production-only `deploy` state |
| `tf-ci-token` | `infra/modules/ci-token` | The Terraform module that mints CI tokens |
| `infra-ci` | `tools/infra-ci` | The OIDC state wrapper, cancellation and recovery tooling |
| `workspace` | `tools/workspace` | Tests for the Biome layer rules |

Packages import each other only through their `package.json` `exports`, for
example `@hackerfeed/ui/atoms/Button`. Inside `apps/web`, `#/*` still maps to
`apps/web/src/*`. Installs are isolated (`bunfig.toml`), so a package can
import only the npm and workspace packages its own `package.json` declares (see
[Project boundaries](#project-boundaries)).

Run one project's targets with Nx, for example `bunx nx test backend` or
`bunx nx run-many -t typecheck,test -p ui,web`. `bunx nx graph` draws the
project graph.

To add a shared library, copy a small one such as `packages/hacker-news`,
rename it in `package.json` and `project.json`, and run `bun install`. Nx finds
its `typecheck` and `test` targets, so CI checks it without workflow changes.

## Scripts

```bash
bun run dev              # Start Vite dev server on port 3000
bun run build            # Production build (apps/web/dist)
gh workflow run deploy.yaml  # Deploy with Terraform outputs in CI
bun run test             # Every project's tests, through Nx
bun run typecheck        # Every project's typecheck, through Nx
bun run lint             # Run Biome lint
bun run format           # Run Biome format
bun run check            # Run Biome lint and format checks
bun run security:audit   # Audit dependencies at high severity and above
```

## Environment

Application environment variables are validated in `apps/web/src/env.ts`.
Cloudflare bindings and production defaults live in `apps/web/wrangler.jsonc`.
The app reads env once and passes what the backend needs to `createBackend` in
`apps/web/src/backend.ts`; packages never read env themselves.

For local development, put public Vite values in `apps/web/.env.local` and
Worker-only secrets in `apps/web/.dev.vars`. Vite and wrangler read them from
the app's directory, so in a checkout from before the move, move both files
there from the repo root:

```bash
# apps/web/.env.local
VITE_WORKOS_CLIENT_ID=...
VITE_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_WORKOS_API_HOSTNAME=api.workos.com
VITE_APP_TITLE=Hacker Feed
VITE_SENTRY_DSN=...
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# apps/web/.dev.vars
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

Persistent data uses Cloudflare D1 through the `DB` binding in
`apps/web/wrangler.jsonc`. Tables are defined in
`packages/backend/src/database/schema.ts`, SQL migrations live in
`packages/backend/migrations/`, and Wrangler applies them.

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
`packages/backend/src/database/schema.ts`. No migration is needed. Story actions must
start with `story.` and set `storyId`, and paper actions must start with
`paper.` and set `paperId`. A CHECK constraint enforces the prefix and the
matching column.

## Infrastructure

The Terraform roots in `infra/cloudflare-prod` (`prod` state) and
`infra/deploy-access` (`deploy` state) create the Cloudflare resources the app
runs on: today, the D1 database and CI's Cloudflare tokens. Both use the
`infra/modules/ci-token` module. They create resources and nothing else.
Wrangler deploys the Worker and its settings from `apps/web/wrangler.jsonc`,
and CI applies `packages/backend/migrations/` in its own step.

Terraform owns the production database `hackerfeed` in the `prod` state. The
import block adopts the existing database on the first apply. Its UUID appears
only there for bootstrap. CI reconciles it on every production run, reads
`database_id` and `database_name`, and passes them to the build as
`D1_DATABASE_ID` and `D1_DATABASE_NAME`. `apps/web/vite.config.ts` writes them
into the `DB` binding of the generated `apps/web/dist/server/wrangler.json`,
which migrations and deployment both use.
The checked-in Wrangler binding uses `local-hackerfeed` for local development;
it is not a remote database identity. Run remote migrations through CI.

PR previews are static fixture demos uploaded as versions of `hackerfeed-web`
using `apps/web/wrangler.preview.jsonc`, without deploying them. Branch aliases and
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
| `hackerfeed-ci-deploy` | `infra/deploy-access`, `deploy` | migrations and Worker deploys |
| `hackerfeed-ci-preview` | `infra/cloudflare-prod`, `prod` | PR version uploads and PR plans |

Jobs read them from Terraform outputs with `tools/infra-ci/cloudflare-token.sh`, so the
`preview` environment holds no Cloudflare token. Token values sit in plain text
in state, and PR jobs can read `prod`; production-only tokens go in `deploy`,
which only `production` can read. See
[Cloudflare CI tokens](docs/cloudflare-ci-deploy-token.md).

Old preview databases and their state are left untouched. Retiring those live
resources is a separate operation; this change removes automatic creation and
cleanup. PRs also show a read-only production Terraform plan.

### State and sign-in

Terraform state lives in `apps/state-backend`, a small Worker on the free plan
(`hackerfeed-terraform-state`) that stores state and locks in its own D1
database. There is no stored password: each CI job requests a GitHub OIDC
token, and the Worker verifies it against GitHub's keys and this repository's
id. The job's GitHub environment decides what it may touch:

| Environment | `prod` state | `deploy` state |
|---|---|---|
| `production` (master only) | read, write, lock | read, write, lock |
| `preview` (pull requests) | read only, for PR plans | none |

Every Terraform command goes through `tools/infra-ci/terraform.sh`, which maps
each state name to its root directory. A Python 3 loopback
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
`python3 tools/infra-ci/recovery_state.py <file.tfstate.enc> <recovered.tfstate>`. Recover
remote state through an authorized CI job before applying again. Do not paste
state into logs, comments, or issues. Local regression tests run with
`bunx nx run-many -t test -p infra-ci,state-backend`; they do not write live
infrastructure. Put Terraform 1.13.4 on `PATH` to run the integration cases.
`bunx nx run-many -t fmt,validate` checks every Terraform project offline.

## AI Assistants (bring your own subscription)

Signed-in users can connect AI apps they already pay for from `/profile`, then
use **Discuss** on any story to chat about it at `/chat/<storyId>`. Replies
stream from the provider and count against the user's own plan. The story, its
post text, and a few top Hacker News comments are sent as context.

The feature is provider-agnostic:

- **`ai_providers` table:** the catalog of AI apps shown on the profile page
  (`id`, `name`, `description`, `manageUrl`, `enabled`, `sortOrder`). It's
  seeded with one row, `chatgpt`.
- **Adapters (`packages/backend/src/ai/providers/<id>/`):** everything
  protocol-specific (OAuth, token refresh, models, streaming) behind the
  `AiProviderAdapter` interface in `packages/backend/src/ai/types.ts`.
- **Generic core (`packages/backend/src/ai/`):** sessions, the sealed OAuth flow cookie,
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

1. Implement `AiProviderAdapter` in `packages/backend/src/ai/providers/<id>/`.
2. Register it in the `adapters` list in `packages/backend/src/ai/runtime.ts`.
3. Add a row with the same `id` to `ai_providers` in a migration.

A row without an adapter is hidden. Setting `enabled` to 0 turns a provider off
without a deploy.

### Configuration

```bash
# apps/web/.dev.vars (optional)
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
configured in `apps/web/wrangler.jsonc`:

```text
30 23 * * *  # 23:30 UTC / 05:00 Asia/Kolkata
```

There is intentionally no public HTTP ingestion route. Apply D1 migrations
before deploying a Worker version that enables ingestion.

Planning docs for this feature live in `docs/paper/`:

- `docs/paper/prd.md`
- `docs/paper/issue.md`
- `docs/paper/questions.md`

## Project boundaries

HackerFeed is a modular monolith: one Worker, built from packages with
enforced interfaces. The backend lives in `packages/backend` so it can later
move to an independent API service.

- `apps/web` is the host. Its routes are thin adapters that call the
  `backend` built in `apps/web/src/backend.ts`.
- The browser reaches backend behavior only over HTTP, through the clients in
  `packages/api-client`.
- `api-client` is the only project allowed to import `backend`, and only the
  types in `@hackerfeed/backend/api-types` (tRPC infers its client from the
  router's type). `api-types` exports only types, so `verbatimModuleSyntax`
  makes every import of it `import type`, and a Biome rule stops `api-client`
  importing any other backend path. In `apps/web`, TanStack Start's import
  protection (`apps/web/vite.config.ts`) fails the client build on any other
  backend import.
- Shared schemas live in `packages/contracts`, never next to the Drizzle
  tables. The backend maps rows to these DTOs.
- `packages/ui` is presentational: no app code, workspace packages, API clients
  or auth.

Which package may import which is the `dependencies` in each `package.json`:
installs are isolated, so importing an undeclared npm or workspace package fails
`tsc`. `tsc` also rejects subpaths missing from a package's `exports`. Review
still has to catch what no tool checks: relative imports into another project,
the root's devDependencies (`nx`, `wrangler`, `vitest`...) resolving from any
package, a Terraform `module` source without a matching `implicitDependencies`
entry, and dependency cycles. Nx's ESLint boundary rule isn't used:
typescript-eslint needs the TypeScript JS API, and TypeScript 7 doesn't ship
one.

tRPC is the current application boundary. Route handlers adapt HTTP/tRPC
requests to backend services; durable domain behavior belongs in services, and
database details belong in repositories.

Story freshness is refresh-on-favorite for this rollout. Stale-on-read story
refresh is intentionally deferred.

### Affected checks

PR builds still run every check on every project. They also record which
projects `nx show projects --affected` would select for the change
("Record affected projects" in the job summary), so the selection can be
compared with the full run before CI switches to it. Root manifests, the
lockfile, workflows, and Biome and lint rules count as inputs to every
project, so a change there selects everything.

Nx caches `typecheck` and Vitest `test` results locally. Biome lints the whole
repo from the root. Builds, Terraform, migrations and deploys are never cached.
There is no remote cache.

## Observability

Sentry tracing and structured logs are enabled in both the browser and the
Cloudflare Worker. Application `logger` calls are attached to the active trace
so the events leading to an error can be inspected alongside it.

The browser and the Worker keep separate traces. The Worker never continues
trace headers from the internet: it strips `sentry-trace`, `baggage`,
`traceparent` and `tracestate`, then starts its own trace for each request, so
a client cannot choose a server trace ID or force sampling. The browser sends
its trace context as `x-client-trace` instead, and the Worker records it as a
span link plus a `client.trace_id` attribute on the request's root span. Every
response returns the server trace ID in `x-sentry-trace-id`. To go from one to
the other in Sentry, search `client.trace_id:<browser trace ID>` for the
server trace, or open the server trace and follow its link. Services added
behind the Worker should continue the Worker's trace, never the browser's.

Story chat streams its reply after a `200`, so HTTP status alone would call a
broken stream a success. The Worker runs the stream in an `AI chat stream`
span and the browser wraps the reply in a `Story chat reply` span. When the
stream fails midway, both, and the Worker's request span, are marked as errors
with an `ai.error_code` attribute. A reply the user stops is `cancelled`,
which Sentry does not count as an error.

Sentry ingests warning and error logs. Trace volume is controlled by
`SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_TRACES_SAMPLE_RATE`; both default to
`0.1`, while error events are captured independently of trace sampling. The
browser and the Worker sample on their own, so a quoted trace ID always finds
its error, but its spans only when that side was sampled.

Production builds upload browser and Worker source maps to Sentry when
`SENTRY_AUTH_TOKEN` (a Sentry organization token, stored as a GitHub secret) is
set, then delete the `.map` files so they are never deployed. Each deploy is
tagged with its commit SHA as the Sentry release (`SENTRY_RELEASE`). Builds
without the token skip source maps.

## Routing

Routes live in `apps/web/src/routes/`. `apps/web/src/routeTree.gen.ts` is
generated by the TanStack Router Vite plugin and should not be edited manually.
Add routes by creating files in `apps/web/src/routes/`; the plugin regenerates
the tree on the next dev server restart or build.

## Styling

Styling uses Tailwind CSS in `packages/ui/src/styles.css`, which the app loads
as `@hackerfeed/ui/styles.css`. Tailwind scans `packages/ui/src` through
`@source`; only atoms and molecules carry classes.
