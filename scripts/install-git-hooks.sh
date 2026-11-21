#!/bin/sh
set -eu

if ! root=$(git rev-parse --show-toplevel 2>/dev/null) || [ "$(pwd -P)" != "$root" ]; then
  exit 0
fi

if hooks_path=$(git config --get core.hooksPath); then
  if [ "$hooks_path" != .githooks ]; then
    printf 'HackerFeed pre-push hook was not installed. core.hooksPath is already set to %s.\n' "$hooks_path" >&2
  fi
  exit 0
fi

hooks_dir=$(git rev-parse --git-path hooks)
for hook in "$hooks_dir"/*; do
  if [ -f "$hook" ] && [ -x "$hook" ]; then
    case "$hook" in
      *.sample) ;;
      *)
        printf 'HackerFeed pre-push hook was not installed. An existing Git hook is at %s.\n' "$hook" >&2
        exit 0
        ;;
    esac
  fi
done

git config --local core.hooksPath .githooks
