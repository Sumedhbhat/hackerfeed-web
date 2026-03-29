# Plan

## Goal

Plan the starter-to-product conversion of this TanStack Start app into a Hacker News reader focused on three core feed tabs, article favorites, mobile-friendly reading flows, and a structure that can later be upgraded into a PWA without doing the PWA work now.

## Context

- The repo is currently a TanStack Start starter with placeholder marketing content in `src/routes/index.tsx`, shared shell UI in `src/routes/__root.tsx`, navigation in `src/components/Header.tsx`, footer branding in `src/components/Footer.tsx`, and global styling in `src/styles.css`.
- The app already has React 19, TanStack Router, TanStack Query, Tailwind v4, Vitest, and a browser manifest in `public/manifest.json`.
- The current app shell is closer to a template/landing page than an app UI, so the home route, header, footer, metadata, manifest content, and overall information architecture all need to be repurposed.
- TanStack Query is already available and should be used for Hacker News feed/item fetching, caching, and refresh behavior.
- Because this is a web app today, true native in-app Safari / SFSafariViewController behavior is not directly available in the browser. The web build should use safe browser navigation patterns now, while isolating link-opening behavior behind an abstraction that can later be swapped for Capacitor/Cordova/native in-app browser behavior during the PWA or hybrid-app phase.
- Audit note: the generated starter routes still include `src/routes/about.tsx`, the `src/routes/demo/*` examples, and the tRPC API endpoint `src/routes/api.trpc.$.tsx`; these are product-irrelevant and can be removed once shell/navigation references are updated.
- Audit note: `src/routes/__root.tsx` and `src/integrations/tanstack-query/root-provider.tsx` currently keep tRPC, WorkOS, and demo store devtools wired into the app shell, so the next shell-branding pass should preserve TanStack Query but plan to remove WorkOS/tRPC/store-demo wiring and the related starter-only dependencies if they are no longer needed elsewhere.
- Shell branding now reads as HackerFeed, with root metadata/manifest updated and starter nav/footer links swapped to Hacker News destinations; the actual home route content is still starter-era and is the next major screen to replace.
- `src/routes/index.tsx` is now a mobile-first HackerFeed shell with local preview data and tabbed ready/loading/error/empty state surfaces; the next data-layer step should replace the local `previewStories` and `feedStates` scaffolding rather than layering a second UI on top.

## Assumptions

- The three requested Hacker News feed types will be `top`, `new`, and `best`, since those are the most common primary feeds.
- Favorites only need client-side persistence for now, most likely via `localStorage` or a small TanStack Store wrapper; no account sync is required.
- The initial version can read directly from the public Hacker News Firebase API and does not need a custom backend unless CORS/rate-limit/product constraints appear during implementation.
- The product should avoid a separate landing page and instead make `/` the main feed experience.
- External article opening on web will use a dedicated reader action that preserves app context and is designed to be replaceable later with an in-app browser integration.
- Existing demo routes and starter branding can be removed or hidden as part of the product conversion.

## Todo

- [x] Audit generated routes and starter/demo dependencies to identify what can be removed versus what should remain for core app infrastructure.
- [x] Replace starter metadata and branding in `src/routes/__root.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, and `public/manifest.json` so the shell reflects the Hacker News reader instead of TanStack starter content.
- [x] Redesign `src/routes/index.tsx` into the primary app screen with feed switching, list rendering, loading/error/empty states, and a mobile-first layout that works as the eventual PWA shell.
- [ ] Add a feed-domain data layer, likely under `src/lib` or `src/features`, to fetch feed IDs and story details from the Hacker News API using TanStack Query with reusable query options and light normalization.
- [ ] Define shared item types and mapping utilities for Hacker News stories, including title, URL, score, author, time, comments count, and fallback handling for text/linkless posts.
- [ ] Implement the three feed tabs (`top`, `new`, `best`) with sensible pagination or incremental loading so the UI is fast on mobile and does not fetch too many items up front.
- [ ] Add a favorites subsystem with persistent client storage, toggle actions on each story card, and a dedicated favorites view or section accessible from the main navigation.
- [ ] Create a reusable story card/list item component with touch-friendly tap targets, metadata rows, a favorite control, and a primary open/read action.
- [ ] Add an external-link handling utility that centralizes article opening behavior, uses the best possible web fallback now, and is structured so a later Capacitor/native bridge can replace it with in-app Safari / custom tabs behavior.
- [ ] Decide how to treat posts without external URLs: open the Hacker News discussion item route or show comments/details in an internal detail route if needed.
- [ ] Add route-level or component-level tests for feed rendering, favorites persistence, tab switching, and link-opening behavior using Vitest and Testing Library.
- [ ] Run validation with `bun --bun run test`, `bun --bun run build`, and a responsive/manual browser pass for mobile and desktop layouts.

## Risks

- Hacker News item fetching can be slow if implemented as many per-item requests without batching or progressive rendering; query design and incremental loading matter.
- Public API availability, latency, and quota behavior may affect perceived performance, especially on mobile networks.
- “In-app Safari view” is not a web-native capability, so the implementation must set correct expectations and keep the abstraction flexible for later platform-specific enhancement.
- Favorites stored only in-browser can be lost on cleared storage and will not sync across devices.
- Removing starter/demo code may require updating generated routes and navigation references carefully to avoid broken links.

## Verification

- Confirm `/` opens directly into the Hacker News reader with no starter/landing content remaining.
- Confirm users can switch between `top`, `new`, and `best` feeds and see correct loading, error, and empty states.
- Confirm users can favorite and unfavorite stories and that favorites persist after refresh.
- Confirm external articles open through the centralized open action and fallback behavior works correctly on mobile and desktop browsers.
- Confirm the UI is usable at common mobile widths and desktop widths, with sticky navigation and touch-friendly controls.
- Confirm production readiness for this phase with passing `test` and `build` scripts.
