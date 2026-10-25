#!/usr/bin/env bash
# Usage: infra/terraform.sh prod|deploy <terraform command> [args...]
# Python 3 is preinstalled on the workflows' ubuntu-latest runners.
set -euo pipefail
exec python3 "$(dirname "$0")/state_proxy.py" "$@"
