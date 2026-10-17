# Private preview with demo data

`scripts/private-preview.sh` runs the current checkout on this machine and
serves it to your tailnet only. It complements the Cloudflare PR previews,
whose databases start empty: the private preview keeps a local D1 (SQLite)
database with demo data, so changes can be checked visually before they ship.

```sh
gh pr checkout <number>              # or any branch
bun run preview:private              # build, migrate, seed, serve
scripts/private-preview.sh seed      # in a second terminal, after signing in
scripts/private-preview.sh --reset   # start again from an empty database
```

It prints `https://<machine>.<tailnet>.ts.net:8443`. Press Ctrl-C to stop; that
also removes the tailnet port.

## What it does

1. Builds the app (`bun run build`), exactly as production does.
2. Applies the branch's migrations to the local database. The database is kept
   between runs, so a PR's new migrations run on top of existing data, as they
   would in production.
3. Starts the built Worker with `wrangler dev`, listening on `127.0.0.1` only.
4. Runs the Worker's cron handler, which ingests the latest Hugging Face Daily
   Papers edition.
5. Seeds the current Hacker News top stories, and gives every signed-in user
   favorites, saved papers and history.
6. Exposes the port with `tailscale serve`, which is reachable only from devices
   on your tailnet. It never uses `tailscale funnel`.

Nothing is read from or written to the Cloudflare databases.

## One-time setup

- Put the WorkOS values in `.env.local` and `.dev.vars` (see README.md >
  Environment). A WorkOS staging environment keeps preview sign-ins out of
  production.
- In WorkOS, add the redirect URI
  `https://<machine>.<tailnet>.ts.net:8443/auth/callback`.
- On first use, sign in, then run `scripts/private-preview.sh seed` so your
  account gets demo favorites and history.

The database lives in `~/.local/state/hackerfeed-web/private-preview`, shared by
every checkout. Override it with `PRIVATE_PREVIEW_STATE_DIR`, the local port
with `PRIVATE_PREVIEW_PORT` (default 8788), and the tailnet port with
`PRIVATE_PREVIEW_HTTPS_PORT` (default 8443).

Sign in with ChatGPT does not work here: without an OpenAI-issued client id it
only accepts `http://127.0.0.1` callbacks.
