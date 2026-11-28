# HackerFeed Web

HackerFeed is a TanStack Start app for reading Hacker News stories, saving
favorites, and browsing the latest ingested Hugging Face Daily Papers edition.
It runs as two Cloudflare Workers: the web app (`apps/web`) and its API
(`apps/api`), which owns the D1 database.

## Stack

- TanStack Start, TanStack Router, TanStack Query, React 19
- Cloudflare Workers: the web app via `@cloudflare/vite-plugin`, the API via Wrangler
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

The repository is an Nx workspace of Bun workspace packages. HackerFeed
deploys two Workers, `hackerfeed-web` (`apps/web`) and `hackerfeed-api`
(`apps/api`); the packages give each part a public interface and its own
checks.

| Project | Path | What it holds |
|---|---|---|
| `web` | `apps/web` | The frontend Worker (TanStack Start): routes, pages, hooks, demo data, Vite and Wrangler config |
| `api` | `apps/api` | The API Worker: origin check, CORS, the D1 binding, the papers cron, Wrangler config |
| `ui` | `packages/ui` | Atoms, molecules and the design tokens stylesheet |
| `entities` | `packages/entities` | Every type and Zod schema the frontend and the backend both use, Hacker News records included |
| `runtime` | `packages/runtime` | Logger, trace headers and client-trace linking, Sentry data policy, HTTP client |
| `backend` | `packages/backend` | Services, repositories, the Drizzle schema, migrations and the tRPC router |
| `entity-state` | `packages/entity-state` | The backend's API types (`AppRouter`, feature flags), type-only |
| `api-client` | `packages/api-client` | Browser transports for tRPC and feature flags |
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

To add a shared library, copy a small one such as `packages/entities`,
rename it in `package.json` and `project.json`, and run `bun install`. Nx finds
its `typecheck` and `test` targets, so CI checks it without workflow changes.

## Scripts

```bash
bun run dev              # Web app on port 3000 and API on port 8787
bun run dev:api          # Only the API, on port 8787
bun run build            # Production builds (apps/web/dist, apps/api/dist)
gh workflow run deploy.yaml  # Deploy with Terraform outputs in CI
bun run test             # Every project's tests, through Nx
bun run typecheck        # Every project's typecheck, through Nx
bun run lint             # Run Biome lint and the unused UI check
bun run lint:ui          # Find UI components unused by the app
bun run format           # Run Biome format
bun run check            # Run Biome lint and format checks plus the unused UI check
bun run security:audit   # Audit dependencies at high severity and above
```

### Pre-push checks

`bun install` enables the tracked Git hook for this clone. Existing Git hook
configurations take precedence. Git runs the hook from the worktree where you
push, so push from the checkout you want to check.

The hook checks the frozen lockfile, then runs `bun run check:push` and blocks
the push if a check fails. The command runs the same Build checks and
dependency override ledger validation as CI. It needs Bun, Node.js 24,
actionlint, ShellCheck, Terraform (CI uses 1.13.4), Python 3, OpenSSL, jq, and
Mike Farah's yq v4 on `PATH`. Playwright downloads Chromium on the first run or
uses the browser at `PLAYWRIGHT_CHROMIUM_PATH`. Install the browser's system
libraries if needed with `bun run --cwd apps/web-e2e playwright install-deps chromium`.

## Environment

The web app validates its environment in `apps/web/src/env.ts`; its Worker
settings live in `apps/web/wrangler.jsonc`. The API reads its bindings and
variables from `apps/api/wrangler.jsonc` and passes what the backend needs to
`createBackend` in `apps/api/src/index.ts`; packages never read env
themselves. `VITE_API_URL` tells the web app where the API is
(`apps/web/.env.development` and `.env.production` set it), and the API's
`ALLOWED_ORIGIN` names the only origin it answers. `bun run dev` sets that to
`http://localhost:3000`.

For local development, put values in each app's directory:

```bash
# apps/web/.env.local
VITE_WORKOS_CLIENT_ID=...
VITE_WORKOS_API_HOSTNAME=api.workos.com
VITE_APP_TITLE=Hacker Feed
VITE_SENTRY_DSN=...
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# apps/web/.dev.vars
SENTRY_DSN=...
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# apps/api/.dev.vars
WORKOS_CLIENT_ID=...   # the same client id as VITE_WORKOS_CLIENT_ID
SENTRY_DSN=...
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
```

`VITE_SENTRY_DSN` is a build-time browser value. `SENTRY_DSN` is read by each
Worker at runtime. Production deploys upload the required secrets in
`.github/workflows/deploy.yaml`.

After changing Cloudflare bindings or variables, regenerate Worker types:

```bash
bun run cf:typegen
```

## Database

Persistent data uses Cloudflare D1 through the `DB` binding in
`apps/api/wrangler.jsonc`; the web Worker has no database. Tables are defined in
`packages/backend/src/database/schema.ts`, SQL migrations live in
`packages/backend/migrations/`, and Wrangler applies them.

```bash
# After changing the Drizzle schema
bun run db:generate --name descriptive_migration_name

# Apply generated migrations
bun run db:migrate:local
gh workflow run deploy.yaml
```

The API Worker creates one typed `DatabaseContext` from its D1 binding. tRPC
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
| `story.chat_opened` | opens a story in the reader's AI chat (Chat with AI) |
| `story.favorited` / `story.unfavorited` | saves or removes a story (clearing logs one unfavorite per story) |
| `paper.read` | opens a paper |
| `paper.chat_opened` | opens a paper in the reader's AI chat (Chat with AI) |
| `paper.favorited` / `paper.unfavorited` | saves or removes a paper |

Favorite events are written in the same D1 batch as the favorite itself, and
only when something changed. Opens are reported by the browser without blocking
the link, so a dropped request loses an event instead of slowing the user down.
Importing favorites from an older local session is not logged.

These events also show which stories a reader has opened, on any device. A
story card's title is greyed like a visited link once the reader has a
`story.read` or `story.discussion_opened` event for it. `favorites.list` joins
each saved story's `lastViewedAt` in. The feed's stories come straight from
Hacker News, so the feed asks `views.storiesLastViewed` one page of IDs at a time.

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
Wrangler deploys the Workers and their settings from `apps/api/wrangler.jsonc`
and `apps/web/wrangler.jsonc`, API first, and CI applies
`packages/backend/migrations/` in its own step.

Terraform owns the production database `hackerfeed` in the `prod` state. The
import block adopts the existing database on the first apply. Its UUID appears
only there for bootstrap. CI reconciles it on every production run, reads
`database_id` and `database_name`, and writes them into the `DB` binding of
`apps/api/wrangler.production.json`, a copy of `apps/api/wrangler.jsonc` that
migrations and the API deploy both use. CI also checks that the web Worker
binds no database.
The checked-in Wrangler binding uses `local-hackerfeed` for local development;
it is not a remote database identity. Run remote migrations through CI.

PR previews are static fixture demos uploaded as versions of `hackerfeed-web`
using `apps/web/wrangler.preview.jsonc`, without deploying them. Branch aliases and
immutable commit URLs are reported on the PR. Because those uploads are newer
than the last release, roll back from the dashboard's deployment list or with
`wrangler rollback <version-id>`: a bare `wrangler rollback` targets the
previous upload, which may be a PR demo. Every browser page gets a fixed demo session; favorites
and views reset on refresh. No D1, WorkOS, AI connections, or production secrets
are used, and the API isn't called. Previews do not validate migrations or
backend behavior. Run
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

Every Terraform command that touches state goes through
`tools/infra-ci/terraform.sh`, which maps each state name to its root directory
(`fmt` and `validate` run `terraform` directly). A Python 3 loopback
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
`bunx nx run-many -t fmt,validate` checks every Terraform project without
remote state or live infrastructure (the first run downloads providers).

## Hugging Face Papers

The `/papers` route serves the latest successful Hugging Face Daily Papers
edition from D1. The API Worker runs ingestion from the Cloudflare cron
configured in `apps/api/wrangler.jsonc`:

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

The frontend and the backend are separate Workers at separate URLs. The
backend's code is in `packages/backend`; `apps/api` is its only host.

- `apps/api` is the API Worker. It answers only requests whose `Origin` is
  `ALLOWED_ORIGIN` (the web app): any other origin, or none, gets `403`. Its
  CORS headers name that one origin, allow `authorization`, `content-type` and
  `x-client-trace`, expose `x-sentry-trace-id`, and let browsers cache the
  preflight for a day. Every other request goes to `createBackend`, which
  verifies the WorkOS access token in `Authorization: Bearer` before any
  route runs: without a valid one, the answer is `401`. The origin check stops
  other websites from calling the API from a visitor's browser; scripts can
  send any `Origin`, so the token is what protects the data.
- `apps/web` is the frontend Worker. It has no API routes, no database and no
  backend code: TanStack Start's import protection (`apps/web/vite.config.ts`)
  fails both its client and server builds on any backend import (except,
  for the demo build, the Drizzle schema's types). Its responses carry a `Content-Security-Policy` whose
  `connect-src` lists only the web app, the API, WorkOS, Hacker News and
  Sentry (`apps/web/src/server/content-security-policy.ts`).
- The browser reaches backend behavior only over HTTP, through the clients in
  `packages/api-client`, at `VITE_API_URL`. `api-client` sees the backend
  only as types, through `packages/entity-state` (tRPC infers its client from
  the router's type). `entity-state` exports only types, so
  `verbatimModuleSyntax` makes every import of it `import type`, and a Biome
  rule stops `api-client` importing `backend` directly.
- Only `apps/web`, `apps/api`, `apps/web-e2e` and `api-client` (tagged
  `scope:web` in Nx) may import `entity-state`: a Biome `noRestrictedImports`
  rule rejects it everywhere else.
- Every type or schema used on both sides lives in `packages/entities`, never
  next to the Drizzle tables. The backend maps rows to these DTOs.
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

Sentry tracing and structured logs are enabled in the browser and in both
Cloudflare Workers. Application `logger` calls are attached to the active trace
so the events leading to an error can be inspected alongside it.

The browser and the Workers keep separate traces. A Worker never continues
trace headers from the internet: it strips `sentry-trace`, `baggage`,
`traceparent` and `tracestate`, then starts its own trace for each request, so
a client cannot choose a server trace ID or force sampling. The browser sends
its trace context as `x-client-trace` on API calls instead, and the API records it as a
span link plus a `client.trace_id` attribute on the request's root span. Every
response returns the server trace ID in `x-sentry-trace-id`. To go from one to
the other in Sentry, search `client.trace_id:<browser trace ID>` for the
server trace, or open the server trace and follow its link. Services added
behind the Worker should continue the Worker's trace, never the browser's.

Sentry ingests warning and error logs. Trace volume is controlled by
`SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_TRACES_SAMPLE_RATE`; both default to
`0.1`, while error events are captured independently of trace sampling. The
browser and the Worker sample on their own, so a quoted trace ID always finds
its error, but its spans only when that side was sampled.

Production builds upload the browser's and the web Worker's source maps to Sentry when
`SENTRY_AUTH_TOKEN` (a Sentry organization token, stored as a GitHub secret) is
set, then delete the `.map` files so they are never deployed. Each deploy is
tagged with its commit SHA as the Sentry release (`SENTRY_RELEASE`). Builds
without the token skip source maps. The API Worker doesn't upload source maps
yet.

## Routing

Routes live in `apps/web/src/routes/`. `apps/web/src/routeTree.gen.ts` is
generated by the TanStack Router Vite plugin and should not be edited manually.
Add routes by creating files in `apps/web/src/routes/`; the plugin regenerates
the tree on the next dev server restart or build.

## Styling

Styling uses Tailwind CSS in `packages/ui/src/styles.css`, which the app loads
as `@hackerfeed/ui/styles.css`. Tailwind scans `packages/ui/src` through
`@source`; only atoms and molecules carry classes.

Colours are roles (`--paper`, `--ink`, `--accent`…), each a `light-dark()`
pair, registered as Tailwind colours (`bg-paper`, `text-ink`). Tailwind's own
palette is switched off, so only the roles compile.

### Modes and palettes

Readers choose light, dark or automatic mode and a colour palette on
`/settings`. Both are saved to their account and follow them to every device.
A palette is two picked colours (a background or a text colour, plus an
accent); `derivePalette` in `apps/web/src/lib/appearance/` works out the other
fifteen for light and dark mode and keeps text readable (4.5:1) whatever was
picked. Only the picked colours are stored, as `#RRGGBB`. The default palette
is the stylesheet itself, and readers who never chose have no row, so changing
the default reaches them.

### AI chat

"Chat with AI" on stories and papers opens a new chat with a prompt about the
item already written. Readers pick the chat on `/settings` (ChatGPT, Claude,
Perplexity or Grok); the choice is `user_preferences.chatProvider`, returned by
`account.me`, so it follows them too. Providers and their prompt URLs live in
`@hackerfeed/entities/chat-providers`.
