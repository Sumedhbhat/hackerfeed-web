---
name: debug-sentry
description: Investigate a HackerFeed production error in Sentry, read-only. Use when the user gives a Sentry trace ID (32 hex chars, shown on HackerFeed error screens, in the `traceId` of a 500 JSON body, or the `x-sentry-trace-id` response header), an issue short ID, or asks why production is failing.
allowed-tools: Bash(sentry auth whoami:*), Bash(sentry auth status:*), Bash(sentry org list:*), Bash(sentry project list:*), Bash(sentry project view:*), Bash(sentry trace view:*), Bash(sentry trace list:*), Bash(sentry trace logs:*), Bash(sentry issue list:*), Bash(sentry issue view:*), Bash(sentry issue events:*), Bash(sentry event view:*), Bash(sentry event list:*), Bash(sentry log list:*), Bash(sentry log view:*), Bash(sentry span list:*), Bash(sentry span view:*), Bash(sentry explore:*), Bash(~/.bun/bin/sentry auth whoami:*), Bash(~/.bun/bin/sentry auth status:*), Bash(~/.bun/bin/sentry org list:*), Bash(~/.bun/bin/sentry project list:*), Bash(~/.bun/bin/sentry project view:*), Bash(~/.bun/bin/sentry trace view:*), Bash(~/.bun/bin/sentry trace list:*), Bash(~/.bun/bin/sentry trace logs:*), Bash(~/.bun/bin/sentry issue list:*), Bash(~/.bun/bin/sentry issue view:*), Bash(~/.bun/bin/sentry issue events:*), Bash(~/.bun/bin/sentry event view:*), Bash(~/.bun/bin/sentry event list:*), Bash(~/.bun/bin/sentry log list:*), Bash(~/.bun/bin/sentry log view:*), Bash(~/.bun/bin/sentry span list:*), Bash(~/.bun/bin/sentry span view:*), Bash(~/.bun/bin/sentry explore:*)
---

# Debug HackerFeed errors with Sentry

Your job is to find out what went wrong and why, then explain it with
evidence. You are an investigator, not an operator: look, don't touch.

## Access and limits

- Tool: Sentry's official CLI, `sentry` (v0.47+). If it isn't on `PATH`, call
  it as `~/.bun/bin/sentry`. `sentry <command> --help` documents every flag.
- The user signed in with `sentry auth login --read-only`. The token's scopes
  are `org:read project:read team:read member:read event:read alerts:read`,
  so Sentry itself rejects any write.
- Stay read-only anyway. Never resolve, archive, merge, assign or delete
  issues; never send events; never create releases, dashboards or projects;
  never run `issue explain`/`issue plan` (they start paid Seer runs); never
  use `sentry api` with a method other than GET. Never run `sentry auth login`,
  `logout`, `refresh` or `token`: the login belongs to the user, and the token
  must never appear in output.
- If a step really needs write access, stop and tell the user what and why.

## Where things are

- Org: `sumedhs-org` (EU region, `de.sentry.io`; the CLI handles this).
- Project: `hackerfeed-web` (ID `4511527347028048`), one project for both the
  browser and the Cloudflare Worker. Issue short IDs look like
  `HACKERFEED-WEB-3`. It was once `javascript-tanstackstart-react`; issue IDs
  with that old prefix no longer resolve, so find them by searching instead.
  If the slug fails, run `sentry project list sumedhs-org/`.
- Pass targets explicitly (`sumedhs-org/<project>/...`) rather than relying on
  auto-detection.

## How HackerFeed reports errors

Read the code when the evidence points into it. The key pieces:

- `src/lib/logger.ts`: the only logger. Every call writes to Sentry Logs and
  the console. `logger.error(msg, { error })` also creates a Sentry issue
  (`captureException`, tag `log_message`). Only warn/error logs are ingested.
- `src/server.ts`: Worker entry. `handleAppFetch` catches anything thrown
  while serving and logs `"Unhandled server request error"` with `method` and
  `pathname`, then returns a 500 carrying the trace ID.
- Browser and Worker traces are separate. The Worker strips incoming trace
  headers and starts its own trace per request (`src/server/tracing/`). The
  browser sends its trace as `x-client-trace`; the Worker stores it as a span
  link and a `client.trace_id` attribute on the root span, and returns its own
  trace ID in `x-sentry-trace-id`. Given a browser trace ID, find the server
  trace with `client.trace_id:<id>`; given a server trace, follow its link.
- Error screens and error toasts show the server trace ID when the failing
  request reached the Worker, and the browser trace ID otherwise.
- Traces are sampled at 10%, separately in the browser and the Worker; errors
  are always captured. An unsampled trace can show only the error itself (one
  span, no duration), and a linked trace on the other side may be missing.
  That is normal, not missing data.
- Env vars are validated by `createEnv` in `src/env.ts` when a request first
  imports it. A failure throws `Invalid environment variables` and breaks
  every request.

## A way in (adapt as the evidence leads)

1. `sentry auth whoami` to confirm access.
2. From a trace ID:
   - `sentry trace view sumedhs-org/<trace-id>`: span tree, project, any error.
   - `sentry trace logs sumedhs-org/<trace-id>`: the logger lines around it.
3. Find the issue: `sentry issue list sumedhs-org/<project> --query "<error text>"`,
   then `sentry issue view <SHORT-ID>` for stack trace, request, breadcrumbs,
   first/last seen and event count. `sentry issue events <SHORT-ID>` shows
   whether it hits every path or one, and since when.
4. Need raw data? `sentry event view sumedhs-org/<project>/<event-id> --json`.
   Use `sentry explore` or `sentry log list ... --query` to look wider.
5. Connect to code and deploys:
   - "First seen" against `git log` and `wrangler deployments list --name
     hackerfeed-web` usually identifies the change that caused it.
   - CI deploys upload source maps and set the release to the commit SHA, so
     stack frames should show `src/...` paths and the event's `release` names
     the exact commit (`git show <release>`). If frames are still minified
     (`assets/router-<hash>.js:<line>`), that build had no maps: use function
     names and messages, or run `bun run build` and look in `dist/`.
6. If Sentry isn't enough, reproduce: `bun run build`, then `bunx vite preview`
   and request the failing path. The Worker's JSON log lines include
   `traceId` and `err`. `wrangler secret list --name hackerfeed-web` shows
   which secrets exist (names only, never values).

## Known gaps (don't over-trust Sentry here)

- Events from before source maps were added, or from builds made without
  `SENTRY_AUTH_TOKEN`, have minified stacks and no `release`.
- `createEnv` validation details show as `[object Array]` in breadcrumbs: the
  variable name is lost. Confirm it from `src/env.ts` against the secret list
  or a local reproduction.

## Report back

- What failed, where (route/procedure, browser vs Worker), since when, how
  often, and whether it's still happening.
- The root cause, with the evidence chain (trace → issue → code/deploy), and
  how confident you are. Separate what you saw from what you're inferring.
- The suggested fix. Don't change production config or secrets without the
  user's go-ahead.
