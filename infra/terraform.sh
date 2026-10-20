#!/usr/bin/env bash
# Runs Terraform in the workspace named by STAGE (default prod).
# Usage: STAGE=pr-42 bun run infra [plan|apply|destroy|output] [terraform args...]
set -euo pipefail

stage=${STAGE:-prod}
command=${1:-plan}
shift || true

if [[ $command == destroy && $stage == prod ]]; then
	echo "Refusing to destroy prod: it holds the production database." >&2
	exit 1
fi

cd "$(dirname "$0")/terraform"
terraform workspace select -or-create "$stage" >/dev/null
terraform "$command" "$@"
