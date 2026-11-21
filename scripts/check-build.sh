#!/usr/bin/env bash
set -euo pipefail

for tool in node bun actionlint shellcheck terraform python3 openssl; do
  if ! command -v "$tool" >/dev/null; then
    printf 'Install %s and add it to PATH to run the Build checks.\n' "$tool" >&2
    exit 1
  fi
done

set -x
unset VITE_DEMO_DATA SENTRY_AUTH_TOKEN
bun run security:audit
bun run check
bun run typecheck
actionlint -color
bun run test

bun run build
matches=$(grep -rlF hackerfeed-demo-data apps/web/dist) || [[ $? -eq 1 ]]
if [[ -n "$matches" ]]; then
  printf 'Production build includes demo fixtures:\n%s\n' "$matches" >&2
  exit 1
fi

if [[ -z "${PLAYWRIGHT_CHROMIUM_PATH:-}" ]]; then
  bun run --cwd apps/web-e2e playwright install chromium
fi
# Require Playwright to start its own demo server.
CI=true bun run e2e
bunx nx run-many -t fmt,validate
