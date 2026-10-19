# HackerFeed Web

HackerFeed is a TanStack Start app for reading Hacker News stories, saving
favorites, and browsing the latest ingested Hugging Face Daily Papers edition.
It runs on any host Nitro can target; today that is Cloudflare Workers (with
D1) or any Node host such as a container (with SQLite or libSQL). See
[Deploy targets](#deploy-targets).

## Stack

- TanStack Start, TanStack Router, TanStack Query, React 19
- Nitro for the server build, one preset per deploy target
- SQLite (Cloudflare D1, a local file, or libSQL) with Drizzle ORM migrations
- tRPC for the browser-to-backend application boundary
- WorkOS AuthKit for authentication
- Sentry for browser and server observability
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
bun run build            # Production build for DEPLOY_TARGET (default node)
bun run start            # Run a node build (.output/server/index.mjs)
bun run preview          # Preview the production build locally
bun run test             # Run Vitest
bun run lint             # Run Biome lint
bun run format           # Run Biome format
bun run check            # Run Biome lint and format checks
bun run security:audit   # Audit dependencies at high severity and above
```

## Environment

Application environment variables are validated in `src/env.ts`. For local
development, put them in `.env.local` (gitignored):

```bash
# .env.local
VITE_WORKOS_CLIENT_ID=...
VITE_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_WORKOS_API_HOSTNAME=api.workos.com
VITE_APP_TITLE=Hacker Feed
VITE_SENTRY_DSN=...
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
AI_TOKEN_ENCRYPTION_KEY=... # at least 32 characters
SENTRY_DSN=...
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SERVER_URL=http://localhost:3000
DATABASE_URL=file:.data/hackerfeed.db  # node target only; the default
```

`VITE_SENTRY_DSN` is a build-time browser value. `SENTRY_DSN` is read by the
server at runtime.

## Deploy targets

`DEPLOY_TARGET` picks the host at build time and is the only switch:

| `DEPLOY_TARGET` | Nitro preset | Database | Cron | Sentry |
|---|---|---|---|---|
| `node` (default) | `node_server` | `DATABASE_URL`: SQLite file or libSQL | in-process (croner) | `@sentry/node` |
| `cloudflare` | `cloudflare_module` | D1 bound as `DB` | Cron Trigger | `@sentry/cloudflare` |

Everything host-specific lives in `src/platform/<target>.ts`, behind the
`ServerPlatform` type in `src/platform/types.ts`. The rest of `src/` never
imports a host SDK. To add a host, add a Nitro preset to `vite.config.ts` and
an adapter next to the others.

### Infrastructure (Terraform)

`infra/terraform` declares the infrastructure for both targets. Its
`deploy_target` variable takes the same values as `DEPLOY_TARGET`:

- `cloudflare` (`infra/terraform/cloudflare`): a D1 database, the Worker
  (`cloudflare_worker` + a `cloudflare_worker_version` made of Nitro's
  `.output` modules and assets), its bindings and secrets, and the daily Cron
  Trigger. `bun run db migrate` runs against D1 before the new version deploys.
- `node` (`infra/terraform/node`): the `Dockerfile` image, a volume for the
  SQLite file, and a container, on whichever Docker daemon `DOCKER_HOST`
  points at (local, or `ssh://user@host`).

State lives in any S3-compatible bucket. Each Terraform workspace is a stage:
`prod` keeps the existing names (`hackerfeed-web`), `pr-<n>` gets its own
Worker and D1 database loaded with `src/demo-data`.

```bash
cp infra/terraform/backend.hcl.example infra/terraform/backend.hcl   # then edit
terraform -chdir=infra/terraform init -backend-config=backend.hcl

export TF_VAR_workos_redirect_uri=... TF_VAR_workos_client_id=... TF_VAR_ai_token_encryption_key=...
DEPLOY_TARGET=cloudflare bun run infra plan    # build, then terraform plan in workspace $STAGE (prod)
DEPLOY_TARGET=cloudflare bun run infra apply
DEPLOY_TARGET=node bun run infra apply
STAGE=pr-42 DEPLOY_TARGET=cloudflare bun run infra destroy
```

Cloudflare also needs `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
`TF_VAR_cloudflare_account_id`; optional settings are the `sentry_dsn`,
`sentry_release`, `chatgpt_client_id`, `chatgpt_client_secret` and `port`
variables. CI applies `prod` on push to `master`, a workspace per PR, and
destroys it when the PR closes. Set the `DEPLOY_TARGET` repository variable to
`node` (and the `DOCKER_HOST` secret) to deploy the container instead; PR
previews stay Cloudflare-only.

The production Worker and D1 database already exist, so import them into the
`prod` workspace once before the first apply:

```bash
terraform -chdir=infra/terraform workspace select -or-create prod
terraform -chdir=infra/terraform import -var deploy_target=cloudflare \
  'module.cloudflare[0].cloudflare_d1_database.this' "$CLOUDFLARE_ACCOUNT_ID/61e6cb7a-29b4-43b6-85af-e82d735a9ed8"
terraform -chdir=infra/terraform import -var deploy_target=cloudflare \
  'module.cloudflare[0].cloudflare_worker.this' "$CLOUDFLARE_ACCOUNT_ID/hackerfeed-web"
```

## Database

Persistent data is SQLite on every target. Tables are defined in
`src/server/database/schema.ts` and SQL migrations live in `migrations/`.
`src/server/database/migrations.ts` applies them and records each one in
`d1_migrations`, the table wrangler uses, so a database exported from one host
imports into another as-is.

```bash
# After changing the Drizzle schema
bun run db:generate --name descriptive_migration_name
```

The node target applies pending migrations on start-up. On Cloudflare, the
infrastructure code runs `bun run db migrate` with `D1_DATABASE_ID` (plus
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`) before the Worker is
updated. Without `D1_DATABASE_ID` the same script targets `DATABASE_URL`;
`bun run db exec <file.sql>` runs a SQL file the same way.

Each request gets one typed `DatabaseContext` from the platform adapter. tRPC
contexts, services, and repositories receive that Drizzle context and never
know which driver is behind it.

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
edition from the database. The `papers:ingest` Nitro task in
`src/server/huggingface-papers/ingestion-task.ts` runs on the schedule in
`vite.config.ts` (a Cron Trigger on Cloudflare, an in-process timer on node):

```text
30 23 * * *  # 23:30 UTC / 05:00 Asia/Kolkata
```

There is intentionally no public HTTP ingestion route.

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
server. Incoming requests, tRPC procedures, and (on Cloudflare) outgoing HTTP
calls and D1 queries are recorded as spans in the same trace. Application `logger` calls
are attached to the active trace so the events leading to an error can be
inspected alongside it.

Sentry ingests warning and error logs. Trace volume is controlled by
`SENTRY_TRACES_SAMPLE_RATE` and `VITE_SENTRY_TRACES_SAMPLE_RATE`; both default to
`0.1`, while error events are captured independently of trace sampling.

Production builds upload browser and server source maps to Sentry when
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
