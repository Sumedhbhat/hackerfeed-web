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
bun run deploy           # Build and deploy the prod stage with Alchemy
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
bun run db:migrate:remote
```

The Worker creates one typed `DatabaseContext` from its D1 binding. tRPC
contexts, services, and repositories receive that Drizzle context; application
code must not access `env.DB` directly outside the Worker boundary.

## Infrastructure

`alchemy.run.ts` declares the Worker, its D1 database and the cron trigger with
[Alchemy](https://alchemy.run). It reads the Worker's settings (vars,
compatibility, crons, observability) from the build's
`dist/server/wrangler.json`, so they stay in `wrangler.jsonc`, and applies
`migrations/` with Wrangler before each new version deploys.

Each Alchemy stage is a copy of the app. `prod` is the production Worker
(`hackerfeed-web`) and the `hackerfeed` database, taken over on its first
deploy; the database is retained, so destroying `prod` never deletes it.
`pr-<n>` gets its own Worker and database loaded with `src/demo-data`; CI
deploys one per pull request and destroys it when the PR closes.

State lives in a store Alchemy deploys to the Cloudflare account. Create it
once with `bunx alchemy provider cloudflare bootstrap`.

```bash
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
export VITE_WORKOS_CLIENT_ID=... AI_TOKEN_ENCRYPTION_KEY=...

bun run build
bunx alchemy plan --stage prod
bunx alchemy deploy --stage pr-42
bunx alchemy destroy --stage pr-42
```

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
