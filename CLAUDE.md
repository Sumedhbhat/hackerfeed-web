# CLAUDE.md

## Product

HackerFeed is my personal tech-news reader, built on Hacker News. I made it because Hacker News didn't look the way I wanted, so this is my own take on it, shaped to fit how I like to read. It should keep me informed about what's happening in tech each day, and show me statistics on how much I'm using it.

I added papers later to keep up with the research side of tech too. I find research papers hard to understand, so the papers features should make them easier for me to digest, or let me consult AI to understand them.

### The one goal

Reading articles and papers is the most important thing the app does. Around that, I need to be able to:

- find articles and save them for later
- work with AI to sort through them
- search for papers, open them on their own sites, and use AI to explain a paper when I don't understand it well enough
- see stats on my own reading

Every feature should serve this goal.

### Priorities

- **Security and privacy.** This is one of the most important things. A person's data is their own, and only they should be able to see or work with it. No one should ever get access to another user's data. Every feature you build must keep the user's data protected.
- **Recoverable.** Every feature needs a way back if it goes wrong, and every merge should be revertable if I want to undo it. That is why the project uses database migrations and Terraform.
- **Fast.** The app should feel snappy. If a feature adds 1% convenience but costs 30% more time or compute, leave it out.
- **Easy to use.** Finding, saving and reading an article/paper should be quick and obvious.
- **Works as well on mobile as on desktop.** Neither is secondary; check UI changes at both sizes.
- **Customisable.** Other people should be able to make the app their own. Themes are the first way to do that, and more configuration options are planned, so build UI that the theme can restyle rather than hard-coding its look.

## Architecture

HackerFeed is a Bun + Nx monorepo deployed as two Cloudflare Workers.

- **`apps/web`** is the frontend: TanStack Start (SSR React) with TanStack Router, Query and Store. It never holds backend code or API routes. It only imports the backend's API types, through `import type` from `@hackerfeed/entity-state`.
- **`apps/api`** is the API. It hosts `packages/backend` and is the only Worker that talks to the database (Cloudflare D1, through Drizzle).
- **`packages/`** holds shared code: `ui` (atoms and molecules), `entities` (every type or schema used by both frontend and backend), `runtime` (logger and similar), `backend`, `entity-state` (the backend's API types for the web side) and `api-client`. Only `apps/web`, `apps/api`, `apps/web-e2e` and `api-client` (Nx tag `scope:web`) may import `entity-state`, and `api-client` may not import `backend` at all. Packages import each other only through their `package.json` `exports`, never by relative path.

### How the pieces fit

- **Hacker News data** comes straight from the public HN API in the browser (`apps/web/src/lib/hacker-news/`). The app fetches the story ID list first, then fetches each story as needed.
- **Auth** uses WorkOS. The browser sends a bearer token, and the API checks it before any route runs. A user's ID always comes from the verified session, never from request input.
- **Per-user data** lives in D1: preferences, palettes and reading activity. Every query is scoped to the signed-in user, and each table is read and written only through its owning module in `packages/backend`.
- **Feature flags** are code, in `packages/backend/src/feature-flags/config.ts`. Use the `feature-flags` skill to change them.
- **Logging** goes through `logger` from `@hackerfeed/runtime/logger` (to Sentry and the console), never `console.*`.
- **UI** follows atomic design. Tailwind classes go only in `packages/ui` atoms and molecules. Organisms and pages in `apps/web/src/components/` compose them without styling of their own.

### Deploys and recovery

- Database changes go in migrations under `packages/backend/migrations`, run as their own CI step.
- Terraform in `infra/` manages Cloudflare resources only and runs only in CI. It doesn't deploy code or run migrations; Wrangler deploys the Workers.

## Commands

```bash
bun run dev        # Web app on :3000 and API on :8787
bun run test       # All tests
bun run e2e        # End-to-end tests
bun run check      # Lint and format check
bun run typecheck  # Type check every project
```
