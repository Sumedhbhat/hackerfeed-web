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

ROOT = Path(__file__).resolve().parents[2]
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
        infra = directory / "infra"
        (infra / "terraform").mkdir(parents=True)
        for name in ("terraform.sh", "state_proxy.py", "recovery_state.py", "commands.py",
                     "ci-signals.sh", "check-production-plan.sh", "check_production_plan.py", "preview_database.py"):
            shutil.copy(ROOT / "infra" / name, infra)
        # Only substitute network transport and discovery. Keep the actual
        # workflow, shell helper, Python forwarding, proxy, and encryption.
        wrapper = infra / "terraform.sh"
        wrapper.write_text(wrapper.read_text().replace("/state_proxy.py", "/local.py"))
        (infra / "local.py").write_text('''import base64, json, os, sys, time
from pathlib import Path
import state_proxy as p
real_tokens, real_server = p.Tokens, p.make_server
root = Path(os.environ["RUNNER_TEMP"])
def issue(*args, **kwargs):
    claims = base64.urlsafe_b64encode(json.dumps({"exp":time.time()+300,"aud":p.STATE_URL}).encode()).decode().rstrip("=")
    return 200, {}, json.dumps({"value":"header."+claims+".signature"}).encode()
def send(url, method="GET", data=None, **kwargs):
    with (root / "events").open("a") as out:
        out.write(json.dumps({"method":method,"url":url})+"\\n")
    if url.endswith("/lock"):
        lock = root / "locked"
        if method == "POST": lock.write_bytes(data)
        if method == "DELETE": lock.unlink(missing_ok=True)
        return 200, {}, b""
    state = root / "saved-state"
    if method == "POST":
        if os.environ.get("FAIL_SAVE") == "true": return 403, {}, b"unavailable"
        state.write_bytes(data)
        return 200, {}, b""
    if method == "DELETE":
        state.unlink(missing_ok=True)
        return 200, {}, b""
    return (200, {}, state.read_bytes()) if state.exists() else (404, {}, b"")
p.Tokens = lambda url, credential: real_tokens(url, credential, send=issue)
def server(stage, password, tokens):
    instance = real_server(stage, password, tokens, send=send)
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
        preview = infra / "preview_database.py"
        preview.write_text(preview.read_text().replace('if __name__ == "__main__":', '''# Local test inventory, no Cloudflare request.
discover = lambda *args: "11111111-1111-1111-1111-111111111111"
if __name__ == "__main__":'''))
        return {**os.environ, "GITHUB_ACTIONS": "true", "RUNNER_TEMP": str(directory),
                "CLOUDFLARE_API_TOKEN": SECRET, "STAGE": "pr-42", "EXISTS": "true",
                "TF_VAR_cloudflare_account_id": "0" * 32,
                "ACTIONS_ID_TOKEN_REQUEST_URL": "https://job.actions.githubusercontent.com/token",
                "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "disposable-local-oidc",
                "GITHUB_OUTPUT": str(directory / "output"),
                "GITHUB_STEP_SUMMARY": str(directory / "summary"),
                "CHECKPOINT_DISABLE": "1", "TF_HTTP_RETRY_MAX": "0"}

    def cancel(self, directory, env, workflow, step, signum):
        script = directory / "step.sh"
        script.write_text(workflow_step(workflow, step) + 'touch "$RUNNER_TEMP/continued"\n')
        child = subprocess.Popen(["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", str(script)],
                                 cwd=directory, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        pids = {child.pid}
        try:
            deadline = time.monotonic() + 10
            while not (directory / "infra/terraform/ready").exists():
                if child.poll() is not None:
                    self.fail(str(child.communicate()))
                self.assertLess(time.monotonic(), deadline, "Terraform did not become ready")
                time.sleep(.02)
            pids = descendants(child.pid)
            child.send_signal(signum)
            # Simulate the runner's INT -> TERM escalation during graceful exit.
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
                code = self.cancel(directory, env, "preview.yaml", "Apply preview infrastructure", signum)
                self.assertEqual(code, 128 + signum)
                self.assert_recovery(directory, "confidential-recovery-state")

    def test_workflow_shells_forward_through_every_nested_caller(self):
        cases = [
            ("preview.yaml", "Apply preview infrastructure", "apply"),
            ("deploy.yaml", "Apply infrastructure", "init"),
            ("deploy.yaml", "Plan infrastructure", "plan"),
            ("deploy.yaml", "Plan infrastructure", "show"),
            ("preview.yaml", "Plan production infrastructure", "plan"),
            ("preview.yaml", "Plan production infrastructure", "guard"),
            ("preview.yaml", "Read preview database", "output"),
            ("deploy.yaml", "Refuse to replace or delete the production database", "show"),
            ("preview-cleanup.yaml", "Destroy preview infrastructure", "destroy"),
            ("preview.yaml", "Adopt legacy preview database", "import"),
            ("preview-cleanup.yaml", "Adopt legacy preview database", "import"),
        ]
        for workflow, step, command in cases:
            for signum in (signal.SIGINT, signal.SIGTERM):
                with self.subTest(step=step, signum=signum), tempfile.TemporaryDirectory() as temporary:
                    directory = Path(temporary)
                    env = self.fixture(directory)
                    binary = directory / "bin"
                    binary.mkdir()
                    fake = binary / "terraform"
                    fake.write_text("#!" + sys.executable + "\n" + '''import json, os, pathlib, signal, sys, time
active = sys.argv[1] == os.environ['BLOCK_COMMAND'] or (
    os.environ['BLOCK_COMMAND'] == 'guard' and sys.argv[1:3] == ['show', '-json'])
if not active:
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
                    self.assertEqual((directory / "infra/terraform/signals").read_text(), "signal\n")
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
                        (directory / "infra/terraform/main.tf").write_text(config)
                        if destroy:
                            result = subprocess.run(["infra/terraform.sh", "pr-42", "apply", "-input=false", "-auto-approve"],
                                                    cwd=directory, env=env, capture_output=True, timeout=15)
                            self.assertEqual(result.returncode, 0, result.stderr)
                            (directory / "events").unlink()
                        env["FAIL_SAVE"] = str(fail_save).lower()
                        self.cancel(directory, env,
                                    "preview-cleanup.yaml" if destroy else "preview.yaml",
                                    "Destroy preview infrastructure" if destroy else "Apply preview infrastructure", signum)
                        events = [json.loads(line) for line in (directory / "events").read_text().splitlines()]
                        self.assertTrue(any(event["method"] == "POST" and not event["url"].endswith("/lock") for event in events))
                        self.assertEqual(events[-1]["method"], "DELETE")
                        self.assertTrue(events[-1]["url"].endswith("/lock"), "cleanup must not delete state after cancellation")
                        self.assertFalse((directory / "locked").exists())
                        if fail_save:
                            self.assert_recovery(directory)
                        else:
                            self.assertTrue(json.loads((directory / "saved-state").read_text())["resources"])
                            self.assertFalse((directory / "infra/terraform/errored.tfstate").exists())
