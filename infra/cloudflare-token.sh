#!/usr/bin/env bash
# Usage: infra/cloudflare-token.sh <stage> <output>
# Gives the job's later steps a Terraform-minted CLOUDFLARE_API_TOKEN, masked.
set -euo pipefail
source "$(dirname "$0")/ci-signals.sh"
account="${CLOUDFLARE_ACCOUNT_ID:-${TF_VAR_cloudflare_account_id:-}}"
if [ "$1" = preview ]; then
  fix="Run the Rotate preview token workflow to create a new one."
else
  fix="Run the deploy workflow to create it."
fi
file="$RUNNER_TEMP/cloudflare-token"
run "$(dirname "$0")/terraform.sh" "$1" output -raw "$2" > "$file"
token=$(cat "$file")
rm "$file"
# A missing output prints a warning and exits 0. Accept only a token, which
# also keeps anything but one line out of $GITHUB_ENV.
if ! [[ "$token" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "::error::Terraform output $2 in $1 is not a token. $fix"
  exit 1
fi
echo "::add-mask::$token"

# Fail here, with the fix, rather than later with a bare authentication error.
test -n "$account"
verify=$(curl -sS -H @<(printf 'Authorization: Bearer %s\n' "$token") \
  "https://api.cloudflare.com/client/v4/accounts/$account/tokens/verify" || true)
status=$(jq -r '.result.status // "invalid"' <<< "$verify" 2>/dev/null || echo invalid)
if [ "$status" != active ]; then
  echo "::error::Cloudflare token $2 from $1 is $status. $fix"
  exit 1
fi
expires=$(jq -r '.result.expires_on // empty' <<< "$verify")
if [ -n "$expires" ] && [ "$(date -d "$expires" +%s)" -lt "$(date -d '+14 days' +%s)" ]; then
  echo "::warning::Cloudflare token $2 from $1 expires on $expires. $fix"
fi

echo "CLOUDFLARE_API_TOKEN=$token" >> "$GITHUB_ENV"
