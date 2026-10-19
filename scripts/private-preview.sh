#!/usr/bin/env bash
# Runs the current checkout on this machine against a local SQLite database
# holding the dummy data in src/demo-data, reachable only from devices on
# the tailnet (`tailscale serve`, never funnel). See docs/private-preview.md.
#
#   scripts/private-preview.sh           build, migrate, load fixtures, serve
#   scripts/private-preview.sh --reset   same, starting from an empty database
#   scripts/private-preview.sh seed      reload src/demo-data/database into a
#                                        running preview
set -euo pipefail

cd "$(dirname "$0")/.."

PORT=${PRIVATE_PREVIEW_PORT:-8788}
HTTPS_PORT=${PRIVATE_PREVIEW_HTTPS_PORT:-8443}
STATE_DIR=${PRIVATE_PREVIEW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/hackerfeed-web/private-preview}
export DATABASE_URL="file:${STATE_DIR}/hackerfeed.db"

# Replaces every row with the dummy data in src/demo-data/database.
seed() {
	local sql
	sql=$(mktemp --suffix .sql)
	bun scripts/demo-data-sql.ts > "$sql"
	bun scripts/db-exec.ts "$sql"
	rm -f "$sql"
	echo "Loaded src/demo-data/database"
}

if [ "${1:-}" = "seed" ]; then
	seed
	exit 0
fi

if [ ! -f .env.local ]; then
	echo "Missing .env.local (see README.md > Environment)" >&2
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

DEPLOY_TARGET=node VITE_DEMO_DATA=true VITE_WORKOS_REDIRECT_URI="${url}/auth/callback" bun run build

# The server applies migrations on start-up; seed once it answers.
HOST=127.0.0.1 PORT="$PORT" SERVER_URL="$url" \
	node --env-file=.env.local .output/server/index.mjs &
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
seed

tailscale serve --bg --https="$HTTPS_PORT" "http://127.0.0.1:${PORT}" > /dev/null

cat <<EOF

Private preview: ${url}
Reachable only from devices on your tailnet. Press Ctrl-C to stop.

EOF
wait "$worker_pid"
