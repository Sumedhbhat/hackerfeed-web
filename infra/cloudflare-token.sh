#!/usr/bin/env bash
# Usage: infra/cloudflare-token.sh <stage> <output>
# Gives the job's later steps a Terraform-minted CLOUDFLARE_API_TOKEN, masked.
set -euo pipefail
source "$(dirname "$0")/ci-signals.sh"
file="$RUNNER_TEMP/cloudflare-token"
run "$(dirname "$0")/terraform.sh" "$1" output -raw "$2" > "$file"
token=$(cat "$file")
rm "$file"
# A missing output prints a warning and exits 0. Accept only a token, which
# also keeps anything but one line out of $GITHUB_ENV.
if ! [[ "$token" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "Terraform output $2 in $1 is not a token; has a production run created it?" >&2
  exit 1
fi
echo "::add-mask::$token"
echo "CLOUDFLARE_API_TOKEN=$token" >> "$GITHUB_ENV"
