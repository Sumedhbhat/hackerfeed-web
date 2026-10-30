#!/usr/bin/env bash
# Static fixture demo, reachable only through the tailnet. Refresh to reset.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PRIVATE_PREVIEW_PORT:-8788}
HTTPS_PORT=${PRIVATE_PREVIEW_HTTPS_PORT:-8443}
host=$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')
if [ -z "$host" ]; then
	echo "This machine is not connected to a tailnet" >&2
	exit 1
fi
url="https://${host}:${HTTPS_PORT}"

bun run build:demo
bunx wrangler dev --config wrangler.preview.jsonc --local --ip 127.0.0.1 --port "$PORT" &
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
