"""Cancel the actual Actions step Bash PID, never an inner Python PID."""
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from recovery_state import crypt

ROOT = Path(__file__).resolve().parents[3]
SECRET = "local-cancellation-recovery-key"


def workflow_step(workflow, name):
    lines = (ROOT / ".github/workflows" / workflow).read_text().splitlines()
    start = lines.index("      - name: " + name)
    for index in range(start + 1, len(lines)):
        if lines[index].startswith("        run: "):
            body = lines[index].removeprefix("        run: ")
            if body != "|":
                return body + "\n"
            result = []
            for line in lines[index + 1:]:
                if line and not line.startswith("          "):
                    break
                result.append(line[10:])
            return "\n".join(result) + "\n"
    raise AssertionError("step has no script")


def descendants(pid):
    rows = subprocess.check_output(["ps", "-eo", "pid=,ppid="]).decode().splitlines()
    pairs = [tuple(map(int, row.split())) for row in rows]
    found = {pid}
    while True:
        expanded = found | {child for child, parent in pairs if parent in found}
        if expanded == found:
            return found
        found = expanded


class CancellationTests(unittest.TestCase):
    def fixture(self, directory):
        infra = directory / "tools/infra-ci"
        infra.mkdir(parents=True)
        (directory / "infra/cloudflare-prod").mkdir(parents=True)
        for name in ("terraform.sh", "state_proxy.py", "recovery_state.py", "commands.py",
                     "ci-signals.sh"):
            shutil.copy(ROOT / "tools/infra-ci" / name, infra)
        # Only substitute network transport. Keep the actual
        # workflow, shell helper, Python forwarding, proxy, and encryption.
        wrapper = infra / "terraform.sh"
        wrapper.write_text(wrapper.read_text().replace("/state_proxy.py", "/local.py"))
        (infra / "local.py").write_text('''import base64, json, os, sys, time
from pathlib import Path
from urllib.error import URLError
import state_proxy as p
real_server = p.make_server
root = Path(os.environ["RUNNER_TEMP"])
def issue(*args, **kwargs):
    if os.environ.get("FAIL_SAVE") == "oidc-stall" and (root / "infra/cloudflare-prod/ready").exists(): time.sleep(30)
    claims = base64.urlsafe_b64encode(json.dumps({"exp":time.time()+300,"aud":p.STATE_URL}).encode()).decode().rstrip("=")
    if os.environ.get("FAIL_SAVE") == "oidc-stall":
        claims = base64.urlsafe_b64encode(json.dumps({"exp":time.time()+1,"aud":p.STATE_URL}).encode()).decode().rstrip("=")
    return 200, {}, json.dumps({"value":"header."+claims+".signature"}).encode()
def send(url, method="GET", data=None, **kwargs):
    if ".actions.githubusercontent.com/" in url: return issue()
    with (root / "events").open("a") as out:
        out.write(json.dumps({"method":method,"url":url})+"\\n")
    if url.endswith("/lock"):
        lock = root / "locked"
        if method == "POST": lock.write_bytes(data)
        if method == "DELETE": lock.unlink(missing_ok=True)
        return 200, {}, b""
    state = root / "saved-state"
    failure = os.environ.get("FAIL_SAVE")
    if failure == "get-stall" and method == "GET" and (root / "infra/cloudflare-prod/ready").exists(): time.sleep(30)
    if method == "POST":
        if failure == "true": return 403, {}, b"unavailable"
        if failure == "500": return 500, {}, b"unavailable"
        if failure == "unavailable": raise URLError("connection refused")
        if failure == "timeout": raise TimeoutError("timed out")
        if failure == "inflight-stall":
            (root / "infra/cloudflare-prod/ready").touch()
            time.sleep(30)
        if failure == "stall": time.sleep(30)
        state.write_bytes(data)
        return 200, {}, b""
    if method == "DELETE":
        state.unlink(missing_ok=True)
        return 200, {}, b""
    return (200, {}, state.read_bytes()) if state.exists() else (404, {}, b"")
p.request = send
def server(stage, password, tokens, **kwargs):
    instance = real_server(stage, password, tokens, **kwargs)
    (root / "port").write_text(str(instance.server_port))
    return instance
p.make_server = server
if os.environ.get("SLOW_RECOVERY") == "true":
    real_preserve = p.preserve_recovery
    def preserve(directory, stage):
        (directory / "ready").touch()
        time.sleep(.3)
        real_preserve(directory, stage)
    p.preserve_recovery = preserve
sys.exit(p.main())
''')
        return {**os.environ, "GITHUB_ACTIONS": "true", "RUNNER_TEMP": str(directory),
                "CLOUDFLARE_API_TOKEN": SECRET,
                "TF_VAR_cloudflare_account_id": "0" * 32,
                "ACTIONS_ID_TOKEN_REQUEST_URL": "https://job.actions.githubusercontent.com/token",
                "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "disposable-local-oidc",
                "GITHUB_OUTPUT": str(directory / "output"),
                "GITHUB_STEP_SUMMARY": str(directory / "summary"),
                # A hostile/inherited retry value must not lengthen cleanup.
                "CHECKPOINT_DISABLE": "1", "TF_HTTP_RETRY_MAX": "99"}

    def cancel(self, directory, env, workflow, step, signum, *, runner_deadline=False, command=None):
        script = directory / "step.sh"
        script.write_text((command or workflow_step(workflow, step)) + 'touch "$RUNNER_TEMP/continued"\n')
        child = subprocess.Popen(["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", str(script)],
                                 cwd=directory, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        pids = {child.pid}
        try:
            deadline = time.monotonic() + 10
            while not (directory / "infra/cloudflare-prod/ready").exists():
                if child.poll() is not None:
                    self.fail(str(child.communicate()))
                self.assertLess(time.monotonic(), deadline, "Terraform did not become ready")
                time.sleep(.02)
            pids = descendants(child.pid)
            started = time.monotonic()
            child.send_signal(signum)
            if runner_deadline:
                # Actual runner budget: INT, then TERM at 7.5s, kill at 10s.
                try:
                    stdout, stderr = child.communicate(timeout=7.5)
                except subprocess.TimeoutExpired:
                    child.send_signal(signal.SIGTERM)
                    stdout, stderr = child.communicate(timeout=2.5)
                self.assertLess(time.monotonic() - started, 10)
            else:
                # Exercise ignored escalation even when cleanup is very fast.
                time.sleep(.1)
                if child.poll() is None:
                    child.send_signal(signal.SIGTERM)
                stdout, stderr = child.communicate(timeout=7)
            self.assertNotEqual(child.returncode, 0, stdout + stderr)
            self.assertFalse((directory / "continued").exists())
            for pid in pids:
                deadline = time.monotonic() + 1
                while Path(f"/proc/{pid}").exists() and time.monotonic() < deadline:
                    time.sleep(.02)
                self.assertFalse(Path(f"/proc/{pid}").exists(), f"orphan process {pid}")
            port = int((directory / "port").read_text())
            with socket.socket() as connection:
                self.assertNotEqual(connection.connect_ex(("127.0.0.1", port)), 0)
            self.assertNotIn(SECRET.encode(), stdout + stderr)
            self.assertNotIn(b"confidential-recovery-state", stdout + stderr)
            return child.returncode
        finally:
            for pid in pids:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            child.communicate(timeout=5)

    def assert_recovery(self, directory, expected=None):
        encrypted = next((directory / "terraform-recovery").glob("**/*.enc"))
        self.assertTrue(Path(str(encrypted) + ".hmac").is_file())
        with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": SECRET}):
            restored = directory / "restored.tfstate"
            crypt(encrypted, restored, decrypt=True)
        if expected:
            self.assertEqual(restored.read_text(), expected)
        else:
            self.assertTrue(json.loads(restored.read_text())["resources"])
        return restored

    def test_cancellation_during_recovery_finishes_encryption_before_exit(self):
        for signum in (signal.SIGINT, signal.SIGTERM):
            with self.subTest(signum=signum), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                env = self.fixture(directory)
                binary = directory / "bin"
                binary.mkdir()
                fake = binary / "terraform"
                fake.write_text("#!" + sys.executable + "\n" + '''import pathlib, sys
if sys.argv[1] == 'init': sys.exit(0)
pathlib.Path('errored.tfstate').write_text('confidential-recovery-state')
sys.exit(1)
''')
                fake.chmod(0o700)
                env.update(PATH=str(binary) + os.pathsep + env["PATH"], SLOW_RECOVERY="true")
                code = self.cancel(directory, env, "deploy.yaml", "Apply infrastructure", signum)
                self.assertEqual(code, 128 + signum)
                self.assert_recovery(directory, "confidential-recovery-state")

    def test_workflow_shells_forward_through_every_nested_caller(self):
        cases = [
            ("deploy.yaml", "Apply infrastructure", "apply"),
            ("deploy.yaml", "Apply infrastructure", "init"),
            ("deploy.yaml", "Plan infrastructure", "plan"),
            ("deploy.yaml", "Plan infrastructure", "show"),
            ("preview.yaml", "Plan production infrastructure", "plan"),
            ("preview.yaml", "Plan production infrastructure", "show"),
            ("deploy.yaml", "Read production database", "output"),
        ]
        for workflow, step, command in cases:
            for signum in (signal.SIGINT, signal.SIGTERM):
                with self.subTest(step=step, signum=signum), tempfile.TemporaryDirectory() as temporary:
                    directory = Path(temporary)
                    env = self.fixture(directory)
                    binary = directory / "bin"
                    binary.mkdir()
                    fake = binary / "terraform"
                    fake.write_text("#!" + sys.executable + "\n" + '''import os, pathlib, signal, sys, time
if sys.argv[1] != os.environ['BLOCK_COMMAND']:
    if sys.argv[1] == 'show': print('{"format_version":"1.0"}')
    sys.exit(0)
# No real upstream request is needed for this process-chain fixture.
def stop(*args):
    with pathlib.Path('signals').open('a') as out: out.write('signal\\n')
    time.sleep(.3)
    pathlib.Path('errored.tfstate').write_text('confidential-recovery-state')
    sys.exit(1)
signal.signal(signal.SIGTERM, stop)
pathlib.Path('ready').touch()
while True: time.sleep(.02)
''')
                    fake.chmod(0o700)
                    env.update(PATH=str(binary) + os.pathsep + env["PATH"], BLOCK_COMMAND=command)
                    self.cancel(directory, env, workflow, step, signum)
                    self.assertEqual((directory / "infra/cloudflare-prod/signals").read_text(), "signal\n")
                    self.assert_recovery(directory, "confidential-recovery-state")
                    self.assertFalse((directory / "output").exists())

    @unittest.skipUnless(shutil.which("terraform"), "terraform executable required")
    def test_real_terraform_saves_unlocks_and_encrypts_on_outer_shell_cancellation(self):
        for destroy in (False, True):
            for fail_save in (False, True):
                for signum in (signal.SIGINT, signal.SIGTERM):
                    with self.subTest(destroy=destroy, fail_save=fail_save, signum=signum), tempfile.TemporaryDirectory() as temporary:
                        directory = Path(temporary)
                        env = self.fixture(directory)
                        config = '''terraform {
 backend "http" {
  lock_method = "POST"
  unlock_method = "DELETE"
  username = "github"
 }
}
resource "terraform_data" "local" {
 input = "local-only"
 provisioner "local-exec" {
  WHEN
  command = "touch ready; sleep 30"
 }
}
'''.replace("WHEN", "when = destroy" if destroy else "")
                        if destroy:
                            # Delete one resource before the cancellable
                            # provisioner so destroy has real state to save.
                            config += '''resource "terraform_data" "earlier" {
 input = "delete-first"
 depends_on = [terraform_data.local]
}
'''
                        (directory / "infra/cloudflare-prod/main.tf").write_text(config)
                        if destroy:
                            result = subprocess.run(["tools/infra-ci/terraform.sh", "prod", "apply", "-input=false", "-auto-approve"],
                                                    cwd=directory, env=env, capture_output=True, timeout=15)
                            self.assertEqual(result.returncode, 0, result.stderr)
                            (directory / "events").unlink()
                        if not destroy:
                            result = subprocess.run(["tools/infra-ci/terraform.sh", "prod", "plan", "-input=false", "-out=tfplan"],
                                                    cwd=directory, env=env, capture_output=True, timeout=15)
                            self.assertEqual(result.returncode, 0, result.stderr)
                        env["FAIL_SAVE"] = str(fail_save).lower()
                        self.cancel(directory, env,
                                    "deploy.yaml", "Apply infrastructure", signum,
                                    command="exec tools/infra-ci/terraform.sh prod destroy -input=false -auto-approve\n" if destroy else None)
                        events = [json.loads(line) for line in (directory / "events").read_text().splitlines()]
                        self.assertTrue(any(event["method"] == "POST" and not event["url"].endswith("/lock") for event in events))
                        self.assertEqual(events[-1]["method"], "DELETE")
                        self.assertTrue(events[-1]["url"].endswith("/lock"), "cleanup must not delete state after cancellation")
                        self.assertFalse((directory / "locked").exists())
                        if fail_save:
                            self.assert_recovery(directory)
                        else:
                            self.assertTrue(json.loads((directory / "saved-state").read_text())["resources"])
                            self.assertFalse((directory / "infra/cloudflare-prod/errored.tfstate").exists())

    @unittest.skipUnless(shutil.which("terraform"), "terraform executable required")
    def test_retryable_and_stalled_network_recover_within_runner_deadline(self):
        cases = [(False, failure) for failure in
                 ("500", "unavailable", "timeout", "stall", "inflight-stall", "get-stall", "oidc-stall")]
        cases.append((True, "500"))
        for destroy, failure in cases:
            for signum in (signal.SIGINT, signal.SIGTERM):
                with self.subTest(destroy=destroy, failure=failure, signum=signum), tempfile.TemporaryDirectory() as temporary:
                    directory = Path(temporary)
                    env = self.fixture(directory)
                    config = '''terraform {
 backend "http" {
  lock_method = "POST"
  unlock_method = "DELETE"
  username = "github"
 }
}
resource "terraform_data" "local" {
 input = "local-only"
 provisioner "local-exec" {
  WHEN
  command = "COMMAND"
 }
}
'''.replace("WHEN", "when = destroy" if destroy else "").replace(
                        "COMMAND", "true" if failure == "inflight-stall" else "touch ready; sleep 30")
                    if destroy:
                        config += '''resource "terraform_data" "earlier" {
 input = "delete-first"
 depends_on = [terraform_data.local]
}
'''
                    (directory / "infra/cloudflare-prod/main.tf").write_text(config)
                    if destroy:
                        result = subprocess.run(["tools/infra-ci/terraform.sh", "prod", "apply", "-input=false", "-auto-approve"],
                                                cwd=directory, env=env, capture_output=True, timeout=15)
                        self.assertEqual(result.returncode, 0, result.stderr)
                    if not destroy:
                        result = subprocess.run(["tools/infra-ci/terraform.sh", "prod", "plan", "-input=false", "-out=tfplan"],
                                                cwd=directory, env=env, capture_output=True, timeout=15)
                        self.assertEqual(result.returncode, 0, result.stderr)
                    env["FAIL_SAVE"] = failure
                    code = self.cancel(directory, env,
                                       "deploy.yaml", "Apply infrastructure", signum,
                                       runner_deadline=True,
                                       command="exec tools/infra-ci/terraform.sh prod destroy -input=false -auto-approve\n" if destroy else None)
                    self.assertEqual(code, 128 + signum)
                    restored = self.assert_recovery(directory)
                    original = directory / "infra/cloudflare-prod/errored.tfstate"
                    self.assertEqual(restored.read_bytes(), original.read_bytes())
                    # Timed-out requests have an unknown remote outcome. Keep
                    # the lock rather than letting a pending write race unlock.
                    self.assertEqual((directory / "locked").exists(), "stall" in failure)
                    # Locally model operator reconciliation, then prove the
                    # decrypted file is accepted by real Terraform state push.
                    (directory / "locked").unlink(missing_ok=True)
                    original.rename(directory / "acknowledged-error.tfstate")
                    env.pop("FAIL_SAVE")
                    result = subprocess.run(["tools/infra-ci/terraform.sh", "prod", "state", "push", str(restored)],
                                            cwd=directory, env=env, capture_output=True, timeout=15)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(json.loads((directory / "saved-state").read_bytes())["resources"],
                                     json.loads(restored.read_bytes())["resources"])
