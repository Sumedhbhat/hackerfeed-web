#!/usr/bin/env bash
# Runs the current checkout on this machine against a local D1 (SQLite)
# database holding the dummy data in fixtures/, reachable only from devices on
# the tailnet (`tailscale serve`, never funnel). See docs/private-preview.md.
#
#   scripts/private-preview.sh           build, migrate, load fixtures, serve
#   scripts/private-preview.sh --reset   same, starting from an empty database
#   scripts/private-preview.sh seed      reload fixtures/database into a
#                                        running preview
set -euo pipefail

cd "$(dirname "$0")/.."

PORT=${PRIVATE_PREVIEW_PORT:-8788}
HTTPS_PORT=${PRIVATE_PREVIEW_HTTPS_PORT:-8443}
STATE_DIR=${PRIVATE_PREVIEW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/hackerfeed-web/private-preview}
CONFIG=dist/server/wrangler.json

d1() {
	bunx wrangler d1 "$@" --local --config "$CONFIG" --persist-to "$STATE_DIR"
}

# Replaces every row with the dummy data in fixtures/database.
seed() {
	local sql
	sql=$(mktemp --suffix .sql)
	bun scripts/demo-data-sql.ts > "$sql"
	d1 execute DB --file "$sql" > /dev/null
	rm -f "$sql"
	echo "Loaded fixtures/database"
}

if [ "${1:-}" = "seed" ]; then
	seed
	exit 0
fi

if [ ! -f .dev.vars ]; then
	echo "Missing .dev.vars (see README.md > Environment)" >&2
	exit 1
fi

host=$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')
if [ -z "$host" ]; then
	echo "This machine is not connected to a tailnet" >&2
	exit 1
fi
url="https://${host}:${HTTPS_PORT}"

if [ "${1:-}" = "--reset" ]; then
	rm -rf "$STATE_DIR"
fi
mkdir -p "$STATE_DIR"

VITE_DEMO_DATA=true VITE_WORKOS_REDIRECT_URI="${url}/auth/callback" bun run build
d1 migrations apply DB
seed

# Run wrangler directly (not via bunx) so stopping it also stops workerd.
./node_modules/.bin/wrangler dev --config "$CONFIG" --local --persist-to "$STATE_DIR" \
	--ip 127.0.0.1 --port "$PORT" --env-file .dev.vars --var "SERVER_URL:${url}" &
worker_pid=$!

# Expose the port to the tailnet only; never use `tailscale funnel` here.
cleanup() {
	tailscale serve --https="$HTTPS_PORT" off > /dev/null 2>&1 || true
	kill "$worker_pid" 2> /dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM

for _ in $(seq 60); do
	curl -s -o /dev/null "http://127.0.0.1:${PORT}/" && break
	sleep 1
done

tailscale serve --bg --https="$HTTPS_PORT" "http://127.0.0.1:${PORT}" > /dev/null

cat <<EOF

Private preview: ${url}
Reachable only from devices on your tailnet. Press Ctrl-C to stop.

EOF
wait "$worker_pid"
