# Private preview with demo data

`bun run preview:private` builds the fixture-backed static demo and serves it
only to your tailnet. It prints `https://<machine>.<tailnet>.ts.net:8443`.
Press Ctrl-C to stop and remove that tailnet port.

```sh
bun run preview:private
```

Tailscale must be signed in on this machine. No `.dev.vars`, WorkOS redirect,
or database setup is needed. Override the local port with
`PRIVATE_PREVIEW_PORT` (default 8788) and the tailnet HTTPS port with
`PRIVATE_PREVIEW_HTTPS_PORT` (default 8443).

The script builds with `VITE_DEMO_DATA=true`, starts Wrangler locally using
`apps/web/wrangler.preview.jsonc`, then exposes it with `tailscale serve`. It does not
use Funnel. Only the static client assets are served.

The fixed demo session starts with fixture favorites and papers. Mutations
last until refresh; **Reset demo** also reloads the page. Authentication and
AI are disabled. This preview does not validate migrations or backend queries.
See [demo data](../apps/web/src/demo-data/README.md) for fixture editing and limits.

For local iteration without Tailscale, use `bun run dev:demo` on port 3000.
Restart or rebuild after editing fixtures.
