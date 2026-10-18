# Private preview with demo data

`scripts/private-preview.sh` runs the current checkout on this machine and
serves it to your tailnet only. Like the Cloudflare PR previews, it shows only
the dummy data in `src/demo-data` (see `src/demo-data/README.md`).

```sh
gh pr checkout <number>              # or any branch
bun run preview:private              # build, migrate, load fixtures, serve
scripts/private-preview.sh seed      # reload src/demo-data/database after editing it
scripts/private-preview.sh --reset   # start again from an empty database
```

It prints `https://<machine>.<tailnet>.ts.net:8443`. Press Ctrl-C to stop; that
also removes the tailnet port. Edits to `src/demo-data/hacker-news.ts` need a restart,
because they are built into the app.

## What it does

1. Builds the app with `VITE_DEMO_DATA=true`, so Hacker News requests are
   answered from `src/demo-data/hacker-news.ts`.
2. Applies the branch's migrations to the local database. The database is kept
   between runs, so new migrations run on top of the previous fixture rows.
3. Replaces every row with `src/demo-data/database`. Anyone who signs in gets the
   demo user's favorites and history.
4. Starts the built Worker with `wrangler dev`, listening on `127.0.0.1` only.
5. Exposes the port with `tailscale serve`, which is reachable only from devices
   on your tailnet. It never uses `tailscale funnel`.

Nothing is read from or written to the Cloudflare databases.

## One-time setup

- Put `VITE_WORKOS_CLIENT_ID` in `.env.local` and `AI_TOKEN_ENCRYPTION_KEY` in
  `.dev.vars` (see README.md > Environment). A WorkOS staging environment keeps
  preview sign-ins out of production.
- In WorkOS, add the redirect URI
  `https://<machine>.<tailnet>.ts.net:8443/auth/callback`.

The database lives in `~/.local/state/hackerfeed-web/private-preview`, shared by
every checkout. Override it with `PRIVATE_PREVIEW_STATE_DIR`, the local port
with `PRIVATE_PREVIEW_PORT` (default 8788), and the tailnet port with
`PRIVATE_PREVIEW_HTTPS_PORT` (default 8443).

Sign in with ChatGPT does not work here: without an OpenAI-issued client id it
only accepts `http://127.0.0.1` callbacks.
