# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent behavior

Before writing, reviewing, or refactoring code, load and follow the `karpathy-guidelines` skill. If the skill is not available in the current agent runtime, follow its core principles: make surgical changes, prefer the simplest correct solution, surface assumptions, avoid speculative abstractions, and verify the result with the narrowest relevant check.

## Commands

```bash
# Development
bun run dev          # Start dev server on port 3000

# Build & deploy
bun run build        # Production build
gh workflow run deploy.yaml  # Deploy with Terraform outputs in CI

# Testing
bun run test         # Every project's tests, through Nx
bunx nx test backend # One project's tests
cd packages/hacker-news && bunx vitest run src/utils.test.ts   # A single test file

# Linting / formatting
bun run lint         # Biome lint
bun run format       # Biome format
bun run check        # Biome check (lint + format together)
bun run typecheck    # tsc --noEmit for every project (CI fails on any type error)

# Workspace
bunx nx graph        # Project graph
```

## Architecture

**Framework stack:** TanStack Start (SSR React framework) + TanStack Router (file-based routing) + TanStack Query (data fetching) + TanStack Store (client state). Deployed to Cloudflare Workers via `@cloudflare/vite-plugin`.

**Workspace:** an Nx workspace of Bun workspace packages, deployed as one Worker. `apps/web` is the TanStack Start host; shared code lives in `packages/` (`ui`, `contracts`, `hacker-news`, `runtime`, `backend`, `api-client`); infrastructure in `apps/state-backend`, `infra/` and `tools/infra-ci`. README > Workspace lists every project. Packages import each other only through their `package.json` `exports` (`@hackerfeed/ui/atoms/Button`); never reach into another project with a relative path. Add a package by copying a small one (`packages/hacker-news`) and renaming it.

**Boundaries:** installs are isolated (`bunfig.toml`), so a package can import only the npm and workspace packages its own `package.json` declares; those `dependencies` are the allowed edges, and adding one is a design change to raise with the user. No tool stops a relative import into another project or a root devDependency used from a package, so don't write either. The backend never reaches the browser: browser code uses only `import type` from `@hackerfeed/backend/api-types` (a Biome rule holds `api-client` to it), and TanStack Start's import protection in `apps/web/vite.config.ts` fails the client build on any other backend import. Packages don't read env; `apps/web/src/backend.ts` passes config into `createBackend`. When a check blocks you, change the code, not the rule.

**Path alias:** inside `apps/web`, `#/*` maps to `apps/web/src/*` (its `package.json` `imports` and `tsconfig.json`). Paths below are relative to `apps/web` unless they start with `packages/`, `infra/` or `tools/`.

### Infrastructure

The Terraform roots `infra/cloudflare-prod` (`prod` state) and `infra/deploy-access` (production-only `deploy` state), with the shared `infra/modules/ci-token` module, create Cloudflare resources (today, the production D1 database `hackerfeed` and CI's Cloudflare tokens) and nothing else. GitHub stores only the Terraform token; Terraform mints the deploy token in `deploy` and the preview token in `prod`, which PR jobs can read, and jobs read them with `tools/infra-ci/cloudflare-token.sh`. Terraform must not deploy code or run migrations: the Worker is deployed by wrangler from `apps/web/wrangler.jsonc`, and migrations (`packages/backend/migrations`) run in their own CI step. CI reconciles production infrastructure and the state server on every production run, always through `tools/infra-ci/terraform.sh`, which maps the state names `prod` and `deploy` to their roots: state lives in the `apps/state-backend` Worker, which signs CI in with GitHub OIDC, so there is no state password and Terraform runs only in CI. Never rename a state or move resource addresses when moving files. CI reads its database identity from Terraform outputs before building and migrating. PR demos deploy static assets with browser-memory fixtures through `apps/web/wrangler.preview.jsonc`. See README > Infrastructure.

### Data flow

The feed page (`src/routes/index.tsx`) uses a two-layer query model:
1. **Layer 1** — `feedStoryIdsQueryOptions(feed)` fetches the full list of story IDs for the active feed (top/new/best). Stale after 60s.
2. **Layer 2** — `storyItemQueryOptions(storyId)` fetches each story individually and progressively. Stale after 5 min.

The route loader (`loader` in `index.tsx`) SSR-prefetches the ID list and warms the cache for the first `PAGE_SIZE` items. On the client, switching tabs or loading more items fetches incrementally without resetting previously loaded tabs.

All HN API calls go through `src/lib/hacker-news/queries.ts` (direct calls to `hacker-news.firebaseio.com`). Normalization (`normalizeStoryItem`, `normalizeStoryIds`) strips dead/deleted items and coerces types before anything touches React. The record types and display helpers live in `packages/hacker-news`; the backend gets the fetchers through `createBackend`.

### Favorites

`src/lib/favorites-store.ts` is a `@tanstack/store` instance that persists to `localStorage` under `hackerfeed:favorites`. It stores the full `HackerNewsStoryRecord` (not just IDs) so favorites render without re-fetching. Actions: `toggleFavorite`, `isFavorited`, `getFavorites`, `clearAllFavorites`. Subscribe with `useStore(favoritesStore, selector)` in components.

### Auth

WorkOS AuthKit owns the session entirely in the browser (`src/integrations/workos/provider.tsx`, `devMode` keeps the refresh token in localStorage). There are no HackerFeed session cookies. `SessionGate` in `__root.tsx` sends signed-out users to WorkOS; only `/auth/callback` and `/auth/signed-out` are public. API calls (the `packages/api-client` transports, configured in `src/lib/trpc/client.ts` and `src/lib/ai/client.ts`) send `Authorization: Bearer <access token>` via `getApiHeaders()` in `src/lib/auth/authkit.ts`; the server verifies it against WorkOS's JWKS with the authenticator from `createRequestAuthenticator()` in `packages/backend/src/auth/workos-access-token.ts`.

### Feature flags

Flags are code, not a service. `packages/backend/src/feature-flags/config.ts` defines them, `GET /api/feature-flags` returns them for the requesting session, and `SessionGate` in `__root.tsx` holds the app until the auth state and that session's flags are both known. Read flags with `useFeatureFlag(name)` on the client, and enforce them with `isFeatureEnabled(name, user)` on the server. Follow `.claude/skills/feature-flags/SKILL.md` to add, target or remove a flag.

### Logging and debugging

Use `logger` from `@hackerfeed/runtime/logger` everywhere (browser and Worker), never `console.*` (CLI scripts in `tools/` print to the console). Each call goes to Sentry Logs (structured, linked to the trace) and the console. Pass the caught value as `error`: `logger.error(msg, { error })` also creates a Sentry issue. Use `warn` where you log and rethrow, so only the code that handles the error reports it. Error screens show the trace ID (`useErrorReport` + `TraceIdNote`). A handled failure the user should hear about goes through `reportError(msg, error, { action: "load" | "save" | "remove", message? })` from `#/lib/errors/report-error` instead of `logger.error`: it logs once, picks a human message, and shows a toast whose Details hold the error ID. TanStack Query mutations already go through it; queries only when a refetch fails behind data on screen. Pass `meta: { notifyOnError: false }` (or `notify: false`) when the component shows the error itself. To debug a report, search `trace:<id>` in Sentry for the issue, logs and spans. Browser and Worker traces are separate: the Worker never continues incoming trace headers, links the browser's `x-client-trace` instead, and returns its own ID in `x-sentry-trace-id` (README > Observability).

### Routing

Routes live in `src/routes/`. `routeTree.gen.ts` is auto-generated by the TanStack Router Vite plugin — do not edit it manually. Add new routes by creating files in `src/routes/`; the plugin regenerates the tree on the next dev-server restart or build.

The root layout (`src/routes/__root.tsx`) wraps every page in `TanStackQueryProvider`, `AppShell`, `SiteHeader`, and `SiteFooter`. It injects a blocking inline script to resolve the dark/light/auto theme before first paint to avoid flash-of-wrong-theme.

### UI components (atomic design)

Every component lives in one of four layers: atoms and molecules in `packages/ui/src/`, organisms and pages in `apps/web/src/components/`. Read a file top-down and it should say *what* is on screen; *how it looks* lives only in the bottom two layers.

| Layer | What goes here | Styling (`className`/`style`) | Data / hooks |
|---|---|---|---|
| `packages/ui/src/atoms/` | One styled element: `Button`, `ButtonLink`, `TextLink`, `Text`, `Heading`, `Kicker`, `Stack`, `Row`, `Card`, `Panel`, `PageContainer`, `Skeleton`, `Icon`, `Avatar`, `TextInput`… | Yes, the only place Tailwind classes are written | No |
| `packages/ui/src/molecules/` | A few atoms composed into a reusable piece: `TabList`, `EmptyState`, `StatusPanel`, `BackLink`, `MetaLine`, `LoadingScreen`… | Yes, layout glue only | No, props in, callbacks out |
| `components/organisms/<feature>/` | A feature section with behavior: `StoryCard`, `SiteHeader`, `Comment`, `PapersFeed`… | **No** | Yes |
| `components/pages/` | The full body of one screen, rendered by a route: `FeedPage`, `StoryPage`, `PapersPage`… | **No** | Yes |

Routes in `src/routes/` stay thin: route config, loader, search params, then render a page. They follow the same rule as pages.

Interactive atoms are built on [Base UI](https://base-ui.com) (`@base-ui/react`), which supplies the keyboard, focus and ARIA behavior; the atom adds the Tailwind look. Its docs ship in `node_modules/@base-ui/react/docs/`.

| Need | Atom (Base UI part) |
|---|---|
| Button | `Button` (`Button`). Links that look like buttons stay `<a>`: `ButtonLink`, `ExternalButtonLink` |
| On/off button, pick-one chips | `ToggleButton`, `ToggleGroup` (`Toggle`, `ToggleGroup`) |
| Tabs | `Tabs`, `TabList`, `Tab`, `TabPanel` (`Tabs`) |
| Drop-down menu | `Menu`, `MenuTrigger`, `MenuPopup`, `MenuGroup`, `MenuItem`, `MenuLinkItem` (`Menu`) |
| Dropdown field | `Select`, `SelectLabel`, `SelectTrigger`, `SelectOptions` (`Select`) |
| Show/hide | `Collapsible`, `CollapsibleTrigger`, `CollapsiblePanel` (`Collapsible`) |
| "Are you sure?" | `AlertDialog*` atoms, composed by the `ConfirmButton` molecule (`AlertDialog`) |
| Picture or initials | `Avatar` (`Avatar`) |
| Text input | `TextInput` (`Input`). `TextArea` is native: Base UI has none |

These atoms manage their own ARIA state: pass `value`, `pressed` or `open`, never `aria-selected`/`aria-pressed`/`aria-expanded` by hand. A toggle keeps one label while pressed (`aria-label="Save to favorites"` + `pressed`). Never use `window.confirm`; use `ConfirmButton`. For a new interactive pattern, check whether Base UI has the component and wrap it in a new atom.

Before building UI, list `packages/ui/src/atoms/` and `packages/ui/src/molecules/` and reuse what is there. Import them as `@hackerfeed/ui/atoms/<Name>`; a new one also needs an entry in `packages/ui/package.json` `exports`. Add a variant to an existing atom before adding a new atom.

Rules, enforced by Biome (`bun run check`) and guarded by `tools/workspace/src/lint-rules.test.ts`:
- `lint/no-styling-outside-atoms.grit` rejects `className`, `class`, `style` and spreads that carry them in every `.tsx` file outside `packages/ui`, including new folders and packages. If no component fits, add an atom/molecule (or a variant) instead of styling inline.
- `noRestrictedElements` rejects raw `<button>`, `<a>`, `<input>`, `<textarea>`, `<select>`, `<h1>`–`<h6>`, `<p>`, `<img>` and `<style>` everywhere outside `packages/ui`. Each diagnostic names the atom to use.
- `noRestrictedImports` stops atoms and molecules from importing app code (`#/*`) or any workspace package but `@hackerfeed/ui`, so they stay presentational. It also stops everything outside `packages/ui/src/atoms/` from importing `@base-ui/*`.
- Exempt (in `biome.json` overrides, never inline): tests, and the stylesheet-free error UI in `apps/web/src/client-entry.tsx`, `router.tsx` and `src/server/errors/`.

When a rule blocks you, change the component, not the rule. Do not edit `biome.json` or `lint/`, add `biome-ignore` for these rules (the test fails on it), restyle elements from `packages/ui/src/styles.css`, or move files to dodge a rule. If the request can't be met within the layers, stop and say so. Colors come from the CSS variables in `packages/ui/src/styles.css` (`--lagoon`, `--sea-ink`…); add a token there rather than using raw Tailwind palette colors or hex values.

Prefer props that describe intent (`tone="soft"`, `size="page"`, `variant="accent"`) over props that leak CSS. Tests that mock `@tanstack/react-router` must provide `createLink` (see `src/test/createLinkMock.tsx`), because the link atoms are built with it.

### Testing

Shared and server packages run Vitest with its defaults (`node`, no config file); `ui` and `api-client` have a `vitest.config.ts` for `happy-dom`. `apps/web/vitest.config.ts` has two projects:
- **`node`** — pure utility and store tests (`src/**/*.test.{ts,tsx}`, excluding `src/components/**` and `*.browser.test.*`)
- **`browser`** — component and browser-API tests using `happy-dom` (`src/components/**/*.test.*` and `src/**/*.browser.test.*`)

In `apps/web`, use the `.browser.test.ts` suffix for anything that touches `window`, `localStorage`, or DOM APIs. Inject collaborators into package code (as `createAiClient(auth)` does) rather than mocking another package's internals.

Base UI in tests: keyboard focus moves a tick after the key press, so wrap focus assertions in `waitFor`. A select option only takes a mouse click that started on it: `fireEvent.pointerDown(option, { pointerType: "mouse" })`, then `fireEvent.click(option)` (see `choose()` in `StoryChatPage.test.tsx`). Popups render in a portal, so query them from `screen`.
