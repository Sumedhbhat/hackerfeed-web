#!/usr/bin/env bash
# Usage: infra/cloudflare-token.sh <stage> <output>
# Gives the job's later steps a Terraform-minted CLOUDFLARE_API_TOKEN, masked.
set -euo pipefail
source "$(dirname "$0")/ci-signals.sh"
file="$RUNNER_TEMP/cloudflare-token"
run "$(dirname "$0")/terraform.sh" "$1" output -raw "$2" > "$file"
token=$(cat "$file")
rm "$file"
test -n "$token"
echo "::add-mask::$token"
echo "CLOUDFLARE_API_TOKEN=$token" >> "$GITHUB_ENV"
