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
bun run deploy           # Build and deploy the Worker
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
WORKOS_API_KEY=...
WORKOS_COOKIE_PASSWORD=... # at least 32 characters
WORKOS_JWT_AUDIENCE=...
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

## Routing

Routes live in `src/routes/`. `src/routeTree.gen.ts` is generated by the
TanStack Router Vite plugin and should not be edited manually. Add routes by
creating files in `src/routes/`; the plugin regenerates the tree on the next dev
server restart or build.

## Styling

Styling uses Tailwind CSS in `src/styles.css`.
