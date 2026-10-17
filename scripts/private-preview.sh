#!/usr/bin/env bash
# Runs the current checkout on this machine against a local D1 (SQLite)
# database filled with demo data, reachable only from devices on the tailnet
# (`tailscale serve`, never funnel). See docs/private-preview.md.
#
#   scripts/private-preview.sh           build, migrate, seed and serve
#   scripts/private-preview.sh --reset   same, starting from an empty database
#   scripts/private-preview.sh seed      re-seed a running preview, e.g. after
#                                        your first sign-in
set -euo pipefail

cd "$(dirname "$0")/.."

PORT=${PRIVATE_PREVIEW_PORT:-8788}
HTTPS_PORT=${PRIVATE_PREVIEW_HTTPS_PORT:-8443}
STATE_DIR=${PRIVATE_PREVIEW_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/hackerfeed-web/private-preview}
CONFIG=dist/server/wrangler.json
HN_API=https://hacker-news.firebaseio.com/v0

d1() {
	bunx wrangler d1 "$@" --local --config "$CONFIG" --persist-to "$STATE_DIR"
}

seed_stories() {
	curl -sSf "$HN_API/topstories.json" | jq '.[:30][]' |
		xargs -P 8 -I{} curl -sSf "$HN_API/item/{}.json" |
		jq -rs --arg sq "'" '
			def q: if . == null then "NULL" else $sq + (tostring | gsub($sq; $sq + $sq)) + $sq end;
			.[] | select(.type == "story" and (.dead | not) and (.deleted | not)) |
			"INSERT OR IGNORE INTO stories (id, hnStoryId, title, url, text, score, hnPostedAt, authorUsername, commentCount, commentIds) VALUES (lower(hex(randomblob(16))), \(.id), \(.title | q), \(.url | q), \(.text | q), \(.score // 0), \(.time | if . then todate else null end | q), \(.by | q), \(.descendants // 0), \(.kids // [] | tojson | q));"
		'
}

# Gives every signed-in user favorites and history. Unique constraints make
# favorites idempotent; views are only added for users without any.
seed_user_activity() {
	cat <<-'SQL'
		INSERT OR IGNORE INTO favorites (id, appUserId, storyId, createdAt)
		SELECT lower(hex(randomblob(16))), u.id, s.id, datetime('now', '-' || (s.rn * 47) || ' minutes')
		FROM app_users u
		CROSS JOIN (SELECT id, row_number() OVER (ORDER BY hnStoryId DESC) AS rn FROM stories ORDER BY hnStoryId DESC LIMIT 8) s;

		INSERT INTO story_views (id, appUserId, storyId, viewedAt, lastUpdatedDate, lastUpdatedBy)
		SELECT lower(hex(randomblob(16))), u.id, s.id, datetime('now', '-' || (s.rn * 23) || ' minutes'), CURRENT_TIMESTAMP, u.id
		FROM app_users u
		CROSS JOIN (SELECT id, row_number() OVER (ORDER BY hnStoryId) AS rn FROM stories ORDER BY hnStoryId LIMIT 15) s
		WHERE NOT EXISTS (SELECT 1 FROM story_views v WHERE v.appUserId = u.id);

		INSERT OR IGNORE INTO paper_favorites (id, appUserId, paperId, createdAt)
		SELECT lower(hex(randomblob(16))), u.id, p.id, datetime('now', '-' || (p.rn * 61) || ' minutes')
		FROM app_users u
		CROSS JOIN (SELECT id, row_number() OVER (ORDER BY upvotes DESC) AS rn FROM hf_papers ORDER BY upvotes DESC LIMIT 5) p;

		INSERT INTO paper_views (id, appUserId, paperId, viewedAt, lastUpdatedDate, lastUpdatedBy)
		SELECT lower(hex(randomblob(16))), u.id, p.id, datetime('now', '-' || (p.rn * 29) || ' minutes'), CURRENT_TIMESTAMP, u.id
		FROM app_users u
		CROSS JOIN (SELECT id, row_number() OVER (ORDER BY paperPublishedAt DESC) AS rn FROM hf_papers ORDER BY paperPublishedAt DESC LIMIT 10) p
		WHERE NOT EXISTS (SELECT 1 FROM paper_views v WHERE v.appUserId = u.id);
	SQL
}

seed() {
	local sql
	sql=$(mktemp --suffix .sql)
	{
		seed_stories
		seed_user_activity
	} > "$sql"
	d1 execute DB --file "$sql" > /dev/null
	rm -f "$sql"

	d1 execute DB --json --command "
		SELECT (SELECT COUNT(*) FROM stories) AS stories,
			(SELECT COUNT(*) FROM hf_papers) AS papers,
			(SELECT COUNT(*) FROM app_users) AS users" |
		jq -r '.[0].results[0] | "Demo data: \(.stories) stories, \(.papers) papers, \(.users) signed-in users"'
}

# Runs the Worker's cron handler, which ingests the latest Hugging Face Daily
# Papers edition into the local database.
ingest_papers() {
	curl -sSf "http://127.0.0.1:${PORT}/cdn-cgi/local/scheduled" > /dev/null
}

if [ "${1:-}" = "seed" ]; then
	seed
	exit 0
fi

if [ ! -f .dev.vars ]; then
	echo "Missing .dev.vars with the WorkOS secrets (see README.md > Environment)" >&2
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

bun run build
d1 migrations apply DB

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

ingest_papers
seed
tailscale serve --bg --https="$HTTPS_PORT" "http://127.0.0.1:${PORT}" > /dev/null

cat <<EOF

Private preview: ${url}
Reachable only from devices on your tailnet. Press Ctrl-C to stop.
After your first sign-in, run \`scripts/private-preview.sh seed\` to give your
account demo favorites and history.

EOF
wait "$worker_pid"
