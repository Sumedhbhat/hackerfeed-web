#!/usr/bin/env bash
set -euo pipefail

for tool in jq yq; do
  if ! command -v "$tool" >/dev/null; then
    printf 'Install %s to check the dependency override ledger.\n' "$tool" >&2
    exit 1
  fi
done

ledger=$(yq -r '.overrides[] | select(.ecosystem == "bun") | .package' .github/dependency-overrides.yml | sort)
overrides=$(jq -r '.overrides // {} | keys[]' package.json | sort)
diff -u -L 'Override ledger' -L 'package.json overrides' \
  <(printf '%s\n' "$ledger") <(printf '%s\n' "$overrides")

incomplete=$(yq -r '.overrides[] | select(.fixed_in == null or .advisory == null or .reason == null or .owner == null or .added == null) | .package // "(unnamed override)"' .github/dependency-overrides.yml)
if [[ -n "$incomplete" ]]; then
  printf 'Every ledger entry needs fixed_in, advisory, reason, owner and added. Incomplete entries:\n%s\n' "$incomplete" >&2
  exit 1
fi
