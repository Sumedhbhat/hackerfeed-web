# Source in multi-command Actions steps, then use run for every Terraform caller.
# Bash defers traps while waiting for a foreground command. An asynchronous
# child plus wait lets the step process forward cancellation immediately.
ci_child=
ci_stop() {
  trap '' INT TERM HUP
  if [ -n "$ci_child" ]; then
    # Bash starts asynchronous commands with SIGINT ignored. TERM works for
    # both nested shell callers and Python, which forwards it to Terraform.
    kill -TERM "$ci_child" 2>/dev/null || true
    wait "$ci_child" || true
  fi
  exit "$1"
}
trap 'ci_stop 130' INT
trap 'ci_stop 143' TERM
trap 'ci_stop 129' HUP

run() {
  local result=0
  "$@" &
  ci_child=$!
  wait "$ci_child" || result=$?
  ci_child=
  return "$result"
}
