---
name: feature-flags
description: Add, enable, disable, target or remove a HackerFeed feature flag. Use when a feature should be hidden, rolled out to specific users, turned on or off for everyone, or when a flag is no longer needed. Flags live in code (packages/backend/src/feature-flags/config.ts); there is no flag service.
---

# Feature flags

HackerFeed's flags are a TypeScript object on the server. Changing one means
editing that object and deploying. There is no dashboard, no env var and no
third-party flag service, so don't add one.

## How it works

| Piece | File | Role |
| --- | --- | --- |
| Config | `packages/backend/src/feature-flags/config.ts` | Every flag: `description`, `enabled`, optional `enabledForUserIds`. Server-only, so the config and its user ids never reach the browser. |
| Evaluator | `packages/backend/src/feature-flags/service.ts` | `evaluateFeatureFlags(user)` returns all flags for a session. `isFeatureEnabled(name, user)` checks one flag inside server code. |
| API | `apps/web/src/routes/api.feature-flags.ts` → `handleFeatureFlagsRequest` in `packages/backend/src/index.ts` | `GET /api/feature-flags` returns `{ flags: { [name]: boolean } }` for the bearer token's user, or the signed-out defaults. `no-store`. |
| Client fetch | `packages/api-client/src/feature-flags.ts`, configured in `apps/web/src/lib/feature-flags/client.ts` | `fetchFeatureFlags()` sends the AuthKit bearer token. The flag types reach the browser as types only, through `@hackerfeed/backend/api-types`. |
| Hooks | `apps/web/src/hooks/useFeatureFlags.ts` | `useFeatureFlag(name)` returns a boolean. The query is keyed by user id, so signing in or out refetches. |
| Gate | `SessionGate` in `apps/web/src/routes/__root.tsx` | Holds every non-public page until both the auth state and that session's flags are known. |

How a flag evaluates: `enabled: true` turns it on for everyone, signed in or
not. Otherwise it is on only for signed-in users listed in `enabledForUserIds`.

It fails closed. If the flags request fails or a name is missing from the
response, `useFeatureFlag` returns `false`. The app still loads, with every
flag off.

## Add a flag

1. Add an entry to `featureFlags` in `config.ts`, named in camelCase after the
   feature:
   ```ts
   newThing: {
   	description: "What it gates (routes, buttons) and why it's off.",
   	enabled: false,
   },
   ```
   The `FeatureFlagName` type picks it up automatically, so the client and
   server both type-check the new name.
2. **Enforce it on the server** for every endpoint the feature uses. Hiding UI
   only hides it; anyone can still call the API. Use
   `isFeatureEnabled("newThing", user)` and answer `404` with
   `code: "feature_disabled"`. For an example, see `isEnabled` in
   `packages/backend/src/ai/http.ts` (wired in `packages/backend/src/ai/runtime.ts`). In tRPC, check
   `ctx.user` inside the procedure.
3. Hide the UI with `const on = useFeatureFlag("newThing")`. Call the hook at
   the top of the component, before any early return. For a whole route, render
   `<Navigate … replace />` when the flag is off, like `apps/web/src/routes/chat.$storyId.tsx`.
4. Tests:
   - Server: inject the flag check, e.g. `isEnabled: () => false`, and assert
     the 404 plus that the service was never called. Evaluation tests pass a
     config object, as in `service.test.ts`. Don't assert on the live
     `featureFlags` values; they change on purpose.
   - Components: mock the hook so no real request is made:
     ```ts
     const flagsMock = vi.hoisted(() => ({ newThing: true }));
     vi.mock("#/hooks/useFeatureFlags", () => ({
     	useFeatureFlag: (name: keyof typeof flagsMock) => flagsMock[name],
     }));
     ```
     Any test that renders a component calling `useFeatureFlag` without this
     mock will try to fetch `/api/feature-flags` (ECONNREFUSED noise, or
     "No QueryClient set").
5. Run `bun run check && bun run test`.

## Turn a flag on or off

- **For specific users:** add their WorkOS user id (`user_01…`) to
  `enabledForUserIds`. Find it in the WorkOS dashboard (Users), or on the
  `user.id` of their Sentry events. Leave a short comment saying who it is.
- **For everyone:** set `enabled: true`.
- **Off again:** set `enabled: false` and/or remove the ids.

Each of these takes effect on deploy. Open clients refetch flags on the next
sign-in, page load, or window focus once the 5-minute stale time has passed.

## Remove a flag

Once a feature is permanently on (or deleted):

1. Delete its entry from `config.ts`. TypeScript then flags every
   `useFeatureFlag("name")` / `isFeatureEnabled("name", …)` call, giving you
   the full list of usages.
2. Delete the gating code. Keep the feature's code path if it shipped, or
   delete the feature if it didn't.
3. Drop the now-unused `isEnabled`-style dependencies and their flag-off tests.

## Rules

- Flags are not secrets and not permissions. Never gate access to someone
  else's data with a flag; use auth checks for that.
- Keep the config declarative, with no network calls or database reads, so
  `/api/feature-flags` stays fast and app start isn't slowed down.
- `Header`/`Footer` render outside `SessionGate`, so flags may still be
  loading there. `useFeatureFlag` returns `false` until they arrive.
