#!/usr/bin/env bash
# Checks every bun override in the ledger. With --open-prs, opens an auto-merging PR for each
# override that is no longer needed, and an issue for each override older than STALE_DAYS.
#
#   NEEDED     without the override, a vulnerable version would be installed
#   WAITING    safe to remove, but it would pull in a version younger than MIN_AGE_DAYS
#   REMOVABLE  safe to remove now
set -euo pipefail
shopt -s inherit_errexit

LEDGER=.github/dependency-overrides.yml
MIN_AGE_DAYS=${MIN_AGE_DAYS:-14}
STALE_DAYS=${STALE_DAYS:-90}
OPEN_PRS=false
[[ ${1:-} == --open-prs ]] && OPEN_PRS=true
now=$(date +%s)

# entry <pkg> <yq expression>: reads one field of the package's ledger entry.
entry() { PKG=$1 yq -r ".overrides[] | select(.ecosystem == \"bun\" and .package == strenv(PKG)) | .$2" "$LEDGER"; }

days_since() { echo $(( (now - $(date -d "$1" +%s)) / 86400 )); }

# Deletes the override and its ledger entry, then re-resolves the lockfile without installing.
drop_override() {
  jq --arg p "$1" 'del(.overrides[$p]) | if .overrides == {} then del(.overrides) else . end' package.json > package.json.tmp
  mv package.json.tmp package.json
  PKG=$1 yq -i 'del(.overrides[] | select(.ecosystem == "bun" and .package == strenv(PKG)))' "$LEDGER"
  bun install --lockfile-only --ignore-scripts >/dev/null
}

# Prints every version of <pkg> resolved in bun.lock, one per line.
resolved_versions() {
  PKG=$1 bun -e '
    const pkg = process.env.PKG;
    const lock = Bun.JSONC.parse(await Bun.file("bun.lock").text());
    for (const [spec] of Object.values(lock.packages)) {
      const at = spec.lastIndexOf("@");
      if (spec.slice(0, at) === pkg) console.log(spec.slice(at + 1));
    }
  ' | sort -u
}

# Prints the status for <pkg> <fixed_in>. Edits files, so run it inside a scratch worktree.
check() {
  local pkg=$1 fixed=$2 audit times v status=REMOVABLE
  drop_override "$pkg"

  # bun audit exits non-zero whenever anything is vulnerable, so capture first, then inspect.
  audit=$(bun audit --json 2>/dev/null || true)
  if jq -e --arg p "$pkg" '.[$p] // [] | length > 0' <<<"$audit" >/dev/null; then
    echo NEEDED; return
  fi

  times=$(curl -fsS "https://registry.npmjs.org/${pkg/\//%2f}" | jq '.time')
  while read -r v; do
    FIXED=$fixed V=$v bun -e 'process.exit(Bun.semver.satisfies(process.env.V, ">=" + process.env.FIXED) ? 0 : 1)' \
      || { echo NEEDED; return; }
    if (( $(days_since "$(jq -r --arg v "$v" '.[$v]' <<<"$times")") < MIN_AGE_DAYS )); then
      status=WAITING
    fi
  done < <(resolved_versions "$pkg")
  echo "$status"
}

open_pr() {
  local pkg=$1 fixed=$2 branch="deps/remove-override-${1//@/}"
  if git ls-remote --exit-code --heads origin "$branch" >/dev/null; then
    echo "  $branch already exists, skipping"; return
  fi
  git switch --quiet -c "$branch"
  git commit --quiet -am "chore(deps): remove override for $pkg" \
    -m "Without the override, every installed $pkg is >= $fixed, bun audit reports nothing for it, and every newly resolved version is at least $MIN_AGE_DAYS days old."
  git push --quiet origin "$branch"
  gh pr create --head "$branch" --title "chore(deps): remove override for $pkg" \
    --body "Opened by the dependency-overrides workflow. Upstream now resolves \`$pkg\` to a fixed version (>= $fixed) on its own, so the override and its ledger entry are no longer needed."
  gh pr merge --auto --squash "$branch"
}

flag_stale() {
  local pkg=$1 title="Stale dependency override: $1"
  if [[ -n $(gh issue list --state open --search "\"$title\" in:title" --json number -q '.[].number') ]]; then
    return
  fi
  gh issue create --title "$title" \
    --body "The override for \`$pkg\` was added on $2 and is still needed. Owner: $3. Check whether $4 has a fix upstream, or replace it."
}

mapfile -t pkgs < <(yq -r '.overrides[] | select(.ecosystem == "bun") | .package' "$LEDGER")

for pkg in "${pkgs[@]}"; do
  fixed=$(entry "$pkg" fixed_in)
  added=$(entry "$pkg" added)
  owner=$(entry "$pkg" owner)
  parents=$(entry "$pkg" 'parents | join(", ")')

  dir=$(mktemp -d)
  git worktree add --quiet --detach "$dir" HEAD
  pushd "$dir" >/dev/null
  status=$(check "$pkg" "$fixed")
  echo "$pkg: $status (override added $added)"
  if $OPEN_PRS; then
    if [[ $status == REMOVABLE ]]; then
      open_pr "$pkg" "$fixed"
    elif [[ $status == NEEDED ]] && (( $(days_since "$added") >= STALE_DAYS )); then
      flag_stale "$pkg" "$added" "$owner" "$parents"
    fi
  fi
  popd >/dev/null
  git worktree remove --force "$dir"
done
