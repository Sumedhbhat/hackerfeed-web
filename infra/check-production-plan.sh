#!/usr/bin/env bash
set -euo pipefail
infra_dir=$(cd "$(dirname "$0")" && pwd)
plan_json=$(mktemp)
trap 'rm -f "$plan_json"' EXIT
# Keep extraction outside a condition: init, authentication and show must succeed.
"$infra_dir/terraform.sh" prod show -json "$@" > "$plan_json"
python3 "$infra_dir/check_production_plan.py" "$plan_json"
