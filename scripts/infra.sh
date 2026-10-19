#!/usr/bin/env bash
# Builds for DEPLOY_TARGET (node builds inside its Docker image instead) and
# runs Terraform in the workspace named by STAGE.
# Usage: DEPLOY_TARGET=cloudflare STAGE=prod bun run infra [plan|apply|destroy] [terraform args...]
set -euo pipefail

export DEPLOY_TARGET=${DEPLOY_TARGET:-node}
stage=${STAGE:-prod}
command=${1:-plan}
shift || true

if [[ $DEPLOY_TARGET == cloudflare && $command != destroy ]]; then
	bun run build
fi

cd "$(dirname "$0")/../infra/terraform"
terraform workspace select -or-create "$stage" >/dev/null
terraform "$command" -var "deploy_target=${DEPLOY_TARGET}" "$@"
