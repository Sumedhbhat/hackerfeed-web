#!/usr/bin/env bash
# Runs Terraform for one stage against the state server (infra/state-backend),
# signed in with this GitHub Actions job's OIDC token. The job needs
# `id-token: write`, and the state server decides from the job's GitHub
# environment which stages it may read or change.
# Usage: infra/terraform.sh <prod|pr-N> <terraform command> [args...]
#        infra/terraform.sh <pr-N> delete-state   (after destroy)
set -euo pipefail

stage=$1
command=$2
shift 2
state_url=https://hackerfeed-terraform-state.kgqk4vdcfq.workers.dev

if [[ $command =~ ^(destroy|delete-state)$ && $stage == prod ]]; then
	echo "Refusing to destroy prod: it holds the production database." >&2
	exit 1
fi
if [[ -z ${ACTIONS_ID_TOKEN_REQUEST_URL:-} ]]; then
	echo "No GitHub OIDC token: run this in a GitHub Actions job with id-token: write." >&2
	exit 1
fi

# A fresh token per run, so a slow earlier step can't leave it expired.
TF_HTTP_PASSWORD=$(curl -sSf -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
	"${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${state_url}" | jq -r .value)
export TF_HTTP_PASSWORD TF_VAR_stage=$stage

if [[ $command == delete-state ]]; then
	curl -sSf -o /dev/null -X DELETE -u "github:${TF_HTTP_PASSWORD}" "${state_url}/states/${stage}"
	exit 0
fi

cd "$(dirname "$0")/terraform"
terraform init -input=false -reconfigure \
	-backend-config="address=${state_url}/states/${stage}" \
	-backend-config="lock_address=${state_url}/states/${stage}/lock" \
	-backend-config="unlock_address=${state_url}/states/${stage}/lock" >/dev/null
terraform "$command" "$@"
