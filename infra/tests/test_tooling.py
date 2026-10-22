import base64
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import importlib.util
import json
import os
import re
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "infra"))


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "infra" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


proxy = load("proxy", "state_proxy.py")
plan = load("plan", "check_production_plan.py")
preview = load("preview", "preview_database.py")
recovery = load("recovery", "recovery_state.py")
ACCOUNT = "0" * 32
IDENTIFIER = "11111111-1111-1111-1111-111111111111"


def jwt(expiry, audience=proxy.STATE_URL):
    body = base64.urlsafe_b64encode(json.dumps({"exp": expiry, "aud": audience}).encode()).decode().rstrip("=")
    return f"header.{body}.signature"


@contextmanager
def server(tokens, send, password="local-secret"):
    instance = proxy.make_server("pr-42", password, tokens, send)
    thread = threading.Thread(target=instance.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{instance.server_port}", instance
    finally:
        instance.shutdown()
        instance.server_close()
        thread.join()


AUTH = {"Authorization": "Basic " + base64.b64encode(b"github:local-secret").decode()}


class PlanTests(unittest.TestCase):
    def document(self, actions=None):
        return {"format_version": "1.2", "terraform_version": "1.13.4", "planned_values": {},
                "configuration": {"root_module": {}}, "resource_changes": [] if actions is None else [{
                    "address": "cloudflare_d1_database.this", "mode": "managed", "type": "cloudflare_d1_database",
                    "name": "this", "change": {"actions": actions}}]}

    def test_schema_and_destruction_controls(self):
        for actions in (None, ["no-op"], ["create"], ["update"]):
            plan.validate(self.document(actions))
        for value in (None, {}, [], {"resource_changes": []}, self.document(["delete"]),
                      self.document(["delete", "create"]), self.document(["create", "delete"]),
                      self.document(["forget"]), self.document(["unknown"]),
                      {**self.document(), "resource_changes": None},
                      {key: value for key, value in self.document().items() if key != "resource_changes"},
                      {**self.document(), "resource_changes": [{}]},
                      {**self.document(), "configuration": None},
                      {**self.document(), "errored": True}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                plan.validate(value)

    def test_extraction_failure_never_passes_guard(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for file in ("check-production-plan.sh", "check_production_plan.py", "ci-signals.sh"):
                shutil.copy(ROOT / "infra" / file, directory)
            wrapper = directory / "terraform.sh"
            for content, code in ((json.dumps(self.document()), 0), (json.dumps(self.document()), 1),
                                  (json.dumps(self.document(["delete"])), 0),
                                  (json.dumps(self.document(["delete"])), 1), ("null", 0), ("", 0), ("{", 0)):
                wrapper.write_text(f"#!/bin/sh\ncat <<'JSON'\n{content}\nJSON\nexit {code}\n")
                wrapper.chmod(0o700)
                result = subprocess.run(["bash", "-eo", "pipefail", "-c",
                    '"$1/check-production-plan.sh" tfplan; echo CONTINUED', "test", str(directory)], capture_output=True)
                safe = code == 0 and content == json.dumps(self.document())
                self.assertEqual(result.returncode == 0, safe)
                self.assertEqual(b"CONTINUED" in result.stdout, safe)


class ProxyTests(unittest.TestCase):
    def tokens(self, clock, ttl=60):
        calls = []
        def issue(url, **kwargs):
            calls.append((url, kwargs))
            return 200, {}, json.dumps({"value": jwt(clock[0] + ttl)}).encode()
        tokens = proxy.Tokens("https://job.actions.githubusercontent.com/token?job=1&audience=wrong",
                              "job-secret", clock=lambda: clock[0], send=issue)
        return tokens, calls

    def test_refresh_and_single_flight(self):
        now = [1000]
        tokens, calls = self.tokens(now)
        first = tokens.get()
        self.assertEqual(tokens.get(), first)
        self.assertEqual(len(calls), 1)
        now[0] += 31
        with ThreadPoolExecutor(max_workers=20) as pool:
            values = list(pool.map(lambda _: tokens.get(), range(20)))
        self.assertEqual(len(set(values)), 1)
        self.assertNotEqual(values[0], first)
        self.assertEqual(len(calls), 2)
        self.assertIn("audience=https%3A%2F%2Fhackerfeed-terraform-state", calls[0][0])
        self.assertNotIn("audience=wrong", calls[0][0])

    def test_invalid_token_and_endpoint_fail_closed(self):
        for url in ("http://job.actions.githubusercontent.com/token", "https://evil.invalid/token",
                    "https://job.actions.githubusercontent.com.evil.invalid/token", "https://user@job.actions.githubusercontent.com/token"):
            with self.assertRaises(ValueError):
                proxy.Tokens(url, "secret")
        for body in ({}, {"value": None}, {"value": "bad"}, {"value": jwt(0)}, {"value": jwt(2000, "wrong")}):
            tokens = proxy.Tokens("https://job.actions.githubusercontent.com/token", "secret", clock=lambda: 1000,
                                  send=lambda *args, **kwargs: (200, {}, json.dumps(body).encode()))
            with self.assertRaises((ValueError, KeyError)):
                tokens.get()

    def test_proxy_boundary_and_401_refresh(self):
        tokens, calls = self.tokens([1000])
        upstream = []
        def send(url, **kwargs):
            upstream.append((url, kwargs))
            return (401 if len(upstream) == 1 else 200), {"Location": "https://evil.invalid", "Set-Cookie": "secret"}, b"{}"
        with server(tokens, send) as (base, instance):
            self.assertEqual(instance.server_address[0], "127.0.0.1")
            self.assertEqual(proxy.request(base + "/states/pr-42", headers=AUTH)[0], 200)
            self.assertEqual(len(calls), 2)
            for path in ("/states/prod", "/states/pr-43", "/states/pr-42?target=evil", "/states/pr-42/../prod"):
                self.assertEqual(proxy.request(base + path, headers=AUTH)[0], 400)
            self.assertEqual(proxy.request(base + "/states/pr-42")[0], 401)
            self.assertEqual(len(upstream), 2)
            self.assertTrue(all(url == proxy.STATE_URL + "/states/pr-42" for url, _ in upstream))
            self.assertNotIn("local-secret", upstream[0][1]["headers"]["Authorization"])
        with server(tokens, lambda *args, **kwargs: (307, {"Location": "https://evil.invalid"}, b"")) as (base, _):
            self.assertEqual(proxy.request(base + "/states/pr-42", headers=AUTH)[0], 502)

    def test_http_client_never_follows_redirects(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        hits = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def do_GET(self):
                hits.append(self.path)
                self.send_response(302)
                self.send_header("Location", "/stolen")
                self.end_headers()
        instance = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=instance.serve_forever, daemon=True)
        thread.start()
        try:
            self.assertEqual(proxy.request(f"http://127.0.0.1:{instance.server_port}/token", headers=AUTH)[0], 302)
            self.assertEqual(hits, ["/token"])
        finally:
            instance.shutdown()
            instance.server_close()
            thread.join()

    def test_network_retries_transient_failures_but_not_auth_failures(self):
        calls = []
        def send(url, **kwargs):
            calls.append((url, kwargs))
            if len(calls) == 1:
                raise TimeoutError("fixture timeout")
            return (500 if len(calls) == 2 else 200), {}, b"state"
        network = proxy.Network(send)
        self.assertEqual(network(proxy.STATE_URL, headers=AUTH)[0], 200)
        self.assertEqual(len(calls), 3)
        self.assertTrue(all(call == (proxy.STATE_URL, {"headers": AUTH}) for call in calls))
        for status in (401, 403, 409):
            calls.clear()
            def rejected(url, **kwargs):
                calls.append(url)
                return status, {}, b""
            self.assertEqual(proxy.Network(rejected)(proxy.STATE_URL)[0], status)
            self.assertEqual(len(calls), 1)

    def test_cancellation_wakes_retry_backoff(self):
        called = threading.Event()
        calls = []
        def send(url, **kwargs):
            calls.append(url)
            called.set()
            return 500, {}, b""
        network = proxy.Network(send)
        with ThreadPoolExecutor(max_workers=1) as pool:
            result = pool.submit(network, proxy.STATE_URL)
            self.assertTrue(called.wait(1))
            started = time.monotonic()
            network.cancel()
            try:
                self.assertEqual(result.result(timeout=.5)[0], 500)
            except proxy.RunnerError:
                pass  # Cancellation can arrive before or during the backoff.
            self.assertLess(time.monotonic() - started, .5)
        self.assertEqual(len(calls), 1)

    def test_total_deadline_bounds_slow_headers_and_body_and_retains_lock(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        for slow_body, cancel in ((False, False), (True, False), (False, True), (True, True)):
            with self.subTest(slow_body=slow_body, cancel=cancel):
                entered, release = threading.Event(), threading.Event()
                hits = []
                class Handler(BaseHTTPRequestHandler):
                    def log_message(self, *args):
                        pass
                    def do_POST(self):
                        hits.append(self.path)
                        entered.set()
                        if not slow_body:
                            release.wait(3)
                        self.send_response(200)
                        self.send_header("Content-Length", "2")
                        self.end_headers()
                        if slow_body:
                            self.wfile.write(b"{")
                            self.wfile.flush()
                            release.wait(3)
                            self.wfile.write(b"}")
                        else:
                            self.wfile.write(b"{}")
                instance = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
                thread = threading.Thread(target=instance.serve_forever, daemon=True)
                thread.start()
                network = proxy.Network(timeout=60 if cancel else .1, cancellation_grace=.1)
                base = f"http://127.0.0.1:{instance.server_port}"
                try:
                    with ThreadPoolExecutor(max_workers=1) as pool:
                        pending = pool.submit(network, base + "/states/pr-42", method="POST", data=b"state")
                        self.assertTrue(entered.wait(1))
                        if cancel:
                            network.cancel()
                        with self.assertRaises(proxy.RunnerError):
                            pending.result(timeout=.5)
                        # Even if the old worker eventually returns, a new
                        # unlock cannot overtake an ambiguous remote write.
                        release.set()
                        with self.assertRaises(proxy.RunnerError):
                            network(base + "/states/pr-42/lock", method="DELETE")
                        self.assertEqual(hits, ["/states/pr-42"])
                finally:
                    release.set()
                    instance.shutdown()
                    instance.server_close()
                    thread.join()

    def test_non_ci_runner_and_secure_recovery(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(proxy.sys, "argv", ["runner", "pr-42", "apply"]):
            with self.assertRaises(proxy.RunnerError):
                proxy.main()
        with tempfile.TemporaryDirectory() as temporary, patch.dict(os.environ, {"RUNNER_TEMP": temporary, "CLOUDFLARE_API_TOKEN": "local-recovery-secret"}):
            directory = Path(temporary) / "terraform"
            directory.mkdir()
            (directory / "errored.tfstate").write_text("sensitive-state")
            proxy.preserve_recovery(directory, "pr-42")
            artifact = next((Path(temporary) / "terraform-recovery/pr-42").glob("*.enc"))
            self.assertNotIn(b"sensitive-state", artifact.read_bytes())
            restored = Path(temporary) / "restored.tfstate"
            recovery.crypt(artifact, restored, decrypt=True)
            self.assertEqual(restored.read_text(), "sensitive-state")
            with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": "wrong-secret"}), self.assertRaises(ValueError):
                recovery.crypt(artifact, Path(temporary) / "wrong.tfstate", decrypt=True)
            artifact.write_bytes(artifact.read_bytes() + b"tamper")
            with self.assertRaises(ValueError):
                recovery.crypt(artifact, Path(temporary) / "tampered.tfstate", decrypt=True)
            self.assertEqual(artifact.stat().st_mode & 0o777, 0o600)
            self.assertEqual(artifact.parent.stat().st_mode & 0o777, 0o700)

    def test_runner_failure_and_signal_preserve_encrypted_state_and_stop_proxy(self):
        import socket
        for interrupted in (False, True):
            with self.subTest(interrupted=interrupted), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                infra = directory / "infra"
                (infra / "terraform").mkdir(parents=True)
                for filename in ("terraform.sh", "state_proxy.py", "recovery_state.py", "commands.py"):
                    shutil.copy(ROOT / "infra" / filename, infra)
                binary = directory / "bin"
                binary.mkdir()
                fake = binary / "terraform"
                fake.write_text("#!" + sys.executable + "\n" + """
import os, pathlib, signal, sys, time
if sys.argv[1] == 'init': sys.exit(0)
assert 'ACTIONS_ID_TOKEN_REQUEST_TOKEN' not in os.environ
pathlib.Path('address').write_text(os.environ['TF_HTTP_ADDRESS'])
def fail(*args):
    pathlib.Path('errored.tfstate').write_text('confidential-recovery-state')
    sys.exit(1)
signal.signal(signal.SIGTERM, fail)
pathlib.Path('ready').touch()
if os.environ['INTERRUPT'] == 'true':
    while True: time.sleep(.05)
else: fail()
""")
                fake.chmod(0o700)
                env = {**os.environ, "PATH": str(binary) + os.pathsep + os.environ["PATH"],
                       "GITHUB_ACTIONS": "true", "RUNNER_TEMP": temporary, "CLOUDFLARE_API_TOKEN": "test-encryption-credential",
                       "ACTIONS_ID_TOKEN_REQUEST_URL": "https://job.actions.githubusercontent.com/token",
                       "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "test-job-credential", "INTERRUPT": str(interrupted).lower()}
                child = subprocess.Popen(["bash", str(infra / "terraform.sh"), "pr-42", "apply"], env=env,
                                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                try:
                    if interrupted:
                        deadline = time.monotonic() + 5
                        while not (infra / "terraform/ready").exists():
                            self.assertIsNone(child.poll())
                            self.assertLess(time.monotonic(), deadline)
                            time.sleep(.02)
                        child.send_signal(signal.SIGTERM)
                    stdout, stderr = child.communicate(timeout=10)
                    self.assertNotEqual(child.returncode, 0)
                    for secret in (b"confidential-recovery-state", b"test-encryption-credential", b"test-job-credential"):
                        self.assertNotIn(secret, stdout + stderr)
                    encrypted = next((directory / "terraform-recovery/pr-42").glob("*.enc"))
                    with patch.dict(os.environ, {"CLOUDFLARE_API_TOKEN": "test-encryption-credential"}):
                        restored = directory / "restored.tfstate"
                        recovery.crypt(encrypted, restored, decrypt=True)
                    self.assertEqual(restored.read_text(), "confidential-recovery-state")
                    port = int((infra / "terraform/address").read_text().split(":")[2].split("/")[0])
                    with socket.socket() as connection:
                        self.assertNotEqual(connection.connect_ex(("127.0.0.1", port)), 0)
                finally:
                    if child.poll() is None:
                        child.kill()
                        child.communicate()

    @unittest.skipUnless(shutil.which("terraform"), "terraform executable required")
    def test_real_terraform_plan_show_apply_across_ports_and_token_expiry(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "main.tf").write_text('''terraform {
  backend "http" {
    lock_method = "POST"
    unlock_method = "DELETE"
    username = "github"
  }
}
resource "terraform_data" "local" {
  input = "local-only"
  provisioner "local-exec" { command = "sleep 2" }
}
''')
            stored = [None]
            requests, issued = [], []
            def issue(url, **kwargs):
                token = jwt(time.time() + 1)
                issued.append(token)
                return 200, {}, json.dumps({"value": token}).encode()
            tokens = proxy.Tokens("https://job.actions.githubusercontent.com/token", "job-secret", send=issue)
            def backend(url, method="GET", headers=None, data=None):
                token = base64.b64decode(headers["Authorization"].split()[1]).decode().split(":", 1)[1]
                claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
                self.assertGreater(claims["exp"], time.time(), "expired token reached backend")
                requests.append((method, url))
                if url.endswith("/lock"):
                    return 200, {}, b""
                if method == "POST":
                    stored[0] = data
                    return 200, {}, b""
                return (200, {}, stored[0]) if stored[0] else (404, {}, b"")
            ports = []
            for arguments in (["plan", "-out=tfplan", "-input=false"], ["show", "-json", "tfplan"],
                              ["apply", "-input=false", "tfplan"]):
                password = "ephemeral-password-" + arguments[0]
                with server(tokens, backend, password) as (base, instance):
                    ports.append(instance.server_port)
                    env = {**os.environ, "TF_HTTP_ADDRESS": base + "/states/pr-42", "TF_HTTP_LOCK_ADDRESS": base + "/states/pr-42/lock",
                           "TF_HTTP_UNLOCK_ADDRESS": base + "/states/pr-42/lock", "TF_HTTP_PASSWORD": password, "CHECKPOINT_DISABLE": "1"}
                    for command in (["init", "-reconfigure", "-input=false"], arguments):
                        result = subprocess.run(["terraform", *command], cwd=directory, env=env, capture_output=True, timeout=30)
                        self.assertEqual(result.returncode, 0, result.stderr.decode())
                    if arguments[0] == "show":
                        plan.validate(json.loads(result.stdout))
            self.assertEqual(len(set(ports)), 3)
            self.assertTrue(json.loads(stored[0])["resources"])
            self.assertGreater(len(set(issued)), 1)
            self.assertEqual(requests[-1][0], "DELETE")
            self.assertFalse((directory / "errored.tfstate").exists())
            # A retried cleanup after destroy must recognize Terraform's real
            # empty-state shape rather than treating it as a read failure.
            with server(tokens, backend) as (base, _):
                env.update(TF_HTTP_ADDRESS=base + "/states/pr-42",
                           TF_HTTP_LOCK_ADDRESS=base + "/states/pr-42/lock",
                           TF_HTTP_UNLOCK_ADDRESS=base + "/states/pr-42/lock", TF_HTTP_PASSWORD="local-secret")
                for command in (["init", "-reconfigure", "-input=false"],
                                ["destroy", "-input=false", "-auto-approve"], ["show", "-json"]):
                    result = subprocess.run(["terraform", *command], cwd=directory, env=env, capture_output=True, timeout=30)
                    self.assertEqual(result.returncode, 0, result.stderr.decode())
                self.assertFalse(preview.managed_database(json.loads(result.stdout), "pr-42", ACCOUNT))


class PreviewTests(unittest.TestCase):
    def state(self, stage="pr-42"):
        return {"format_version": "1.0", "values": {"root_module": {"resources": [{
            "address": preview.DATABASE, "mode": "managed", "type": "cloudflare_d1_database", "values": {
                "name": f"hackerfeed-web-{stage}", "account_id": ACCOUNT, "id": IDENTIFIER}}]}}}

    def test_exact_state_and_absence_controls(self):
        self.assertFalse(preview.managed_database({"format_version": "1.0"}, "pr-42", ACCOUNT))
        self.assertTrue(preview.managed_database(self.state(), "pr-42", ACCOUNT))
        for state in (None, {}, {"format_version": "1.0", "values": None}, self.state("pr-43"),
                      {"format_version": "1.0", "values": {}}):
            with self.assertRaises((ValueError, TypeError)):
                preview.managed_database(state, "pr-42", ACCOUNT)

    def test_inventory_pagination_exact_name_errors_and_duplicates(self):
        row = {"name": "hackerfeed-web-pr-42", "uuid": IDENTIFIER}
        def response(rows, success=True, status=200):
            return status, {}, json.dumps({"success": success, "result": rows}).encode()
        self.assertEqual(preview.discover("pr-42", ACCOUNT, "secret", lambda *a, **k: response([row])), IDENTIFIER)
        self.assertIsNone(preview.discover("pr-42", ACCOUNT, "secret", lambda *a, **k: response([
            {**row, "name": "hackerfeed-web-pr-420"}, {**row, "name": "hackerfeed"}])))
        pages = [response([{**row, "name": "unrelated"}] * 100), response([row])]
        self.assertEqual(preview.discover("pr-42", ACCOUNT, "secret", lambda *a, **k: pages.pop(0)), IDENTIFIER)
        for result in (response([], False), response([], status=503), response(None), response([row, row]),
                       response([{**row, "uuid": next(iter(preview.PROTECTED_IDS))}])):
            with self.assertRaises(ValueError):
                preview.discover("pr-42", ACCOUNT, "secret", lambda *a, **k: result)
        pages = [response([row] * 100), response([], status=503)]
        with self.assertRaises(ValueError):
            preview.discover("pr-42", ACCOUNT, "secret", lambda *a, **k: pages.pop(0))

    def test_adoption_errors_never_become_absence_or_publish_outputs(self):
        scenarios = ([subprocess.CalledProcessError(1, "show")],
                     [b"null"],
                     [b'{"format_version":"1.0"}', subprocess.CalledProcessError(1, "import")])
        for responses in scenarios:
            with self.subTest(responses=responses), tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary) / "output"
                with patch.dict(os.environ, {"TF_VAR_cloudflare_account_id": ACCOUNT,
                        "CLOUDFLARE_API_TOKEN": "test", "GITHUB_OUTPUT": str(output)}), \
                        patch.object(preview.sys, "argv", ["preview", "pr-42"]), \
                        patch.object(preview.Commands, "output", side_effect=responses), \
                        patch.object(preview, "discover", return_value=IDENTIFIER), \
                        self.assertRaises((ValueError, subprocess.CalledProcessError)):
                    preview.main()
                self.assertFalse(output.exists())

    def test_adoption_and_cleanup_contract(self):
        for exists, identifier in ((True, None), (False, IDENTIFIER), (False, None)):
            with tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary) / "output"
                responses = [json.dumps(self.state() if exists else {"format_version": "1.0"}).encode()]
                if identifier:
                    responses.extend([b"Imported", json.dumps(self.state()).encode()])
                with patch.dict(os.environ, {"TF_VAR_cloudflare_account_id": ACCOUNT, "CLOUDFLARE_API_TOKEN": "test", "GITHUB_OUTPUT": str(output)}), \
                        patch.object(preview.sys, "argv", ["preview", "pr-42"]), \
                        patch.object(preview.Commands, "output", side_effect=responses) as command, \
                        patch.object(preview, "discover", return_value=identifier) as inventory:
                    preview.main()
                    self.assertEqual(command.call_count, 3 if identifier else 1)
                    self.assertEqual(inventory.call_count, 0 if exists else 1)
                    if identifier:
                        self.assertEqual(command.call_args_list[1].args[0][-4:], ["import", "-input=false", preview.DATABASE, ACCOUNT + "/" + IDENTIFIER])
                    self.assertEqual(output.read_text(), f"exists={str(exists or bool(identifier)).lower()}\nimported={str(bool(identifier)).lower()}\n")
        with patch.object(preview.sys, "argv", ["preview", "prod"]), patch.dict(os.environ, {"TF_VAR_cloudflare_account_id": ACCOUNT}), \
                self.assertRaises(ValueError):
            preview.main()


class WorkflowTests(unittest.TestCase):
    def test_production_reconciles_and_both_guards_are_wired(self):
        production = (ROOT / ".github/workflows/deploy.yaml").read_text()
        self.assertNotIn("event.before", production)
        self.assertNotIn("needs.changes", production)
        self.assertIn("needs: state-backend", production)
        self.assertIn("needs: infrastructure", production)
        for job in ("state-backend", "infrastructure"):
            body = re.split(r"\n  [a-z][a-z-]*:", production.split(f"  {job}:\n", 1)[1], maxsplit=1)[0]
            self.assertNotRegex(body, r"(?m)^    if:")
        for workflow in ("deploy.yaml", "preview.yaml"):
            text = (ROOT / ".github/workflows" / workflow).read_text()
            self.assertIn("infra/check-production-plan.sh tfplan", text)
            self.assertNotIn("if infra/terraform.sh prod show", text)
        for workflow in ("preview.yaml", "preview-cleanup.yaml"):
            text = (ROOT / ".github/workflows" / workflow).read_text()
            self.assertLess(text.index("python3 infra/preview_database.py"), text.index('infra/terraform.sh "$STAGE" ' +
                            ("destroy" if "cleanup" in workflow else "apply")))
        for workflow in ("deploy.yaml", "preview.yaml", "preview-cleanup.yaml"):
            text = (ROOT / ".github/workflows" / workflow).read_text()
            self.assertIn("terraform-recovery/**/*.enc", text)
            self.assertIn("terraform-recovery/**/*.hmac", text)
            self.assertIn("retention-days: 1", text)
