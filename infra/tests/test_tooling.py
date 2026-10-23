import base64
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager, redirect_stderr
import importlib.util
import io
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
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "infra"))


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "infra" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


proxy = load("proxy", "state_proxy.py")
recovery = load("recovery", "recovery_state.py")


def jwt(expiry, audience=proxy.STATE_URL):
    body = base64.urlsafe_b64encode(json.dumps({"exp": expiry, "aud": audience}).encode()).decode().rstrip("=")
    return f"header.{body}.signature"


@contextmanager
def server(tokens, send, password="local-secret"):
    instance = proxy.make_server("prod", password, tokens, send)
    thread = threading.Thread(target=instance.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{instance.server_port}", instance
    finally:
        instance.shutdown()
        instance.server_close()
        thread.join()


AUTH = {"Authorization": "Basic " + base64.b64encode(b"github:local-secret").decode()}


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

    def test_job_oidc_url_preserves_query_and_encodes_audience_once(self):
        # Actions runner supplies an idtoken endpoint with an existing query.
        # Its audience must decode to the same value used by the deployed Worker.
        url = ("https://pipelinesghubeus2.actions.githubusercontent.com/tenant/"
               "_apis/distributedtask/hubs/build/plans/plan/jobs/job/idtoken?"
               "api-version=2.0&scope=build%2Fjob&audience=old")
        calls = []
        def issue(target, **kwargs):
            calls.append((target, kwargs))
            return 200, {}, json.dumps({"value": jwt(2000)}).encode()
        tokens = proxy.Tokens(url, "disposable-job-secret", clock=lambda: 1000, send=issue)
        self.assertEqual(tokens.get(), jwt(2000))
        target, kwargs = calls[0]
        self.assertEqual(urlsplit(target).path, urlsplit(url).path)
        self.assertEqual(parse_qs(urlsplit(target).query), {
            "api-version": ["2.0"], "scope": ["build/job"], "audience": [proxy.STATE_URL]})
        self.assertEqual(target.count("audience="), 1)
        self.assertNotIn("%253A", target)
        self.assertEqual(kwargs, {"headers": {"Authorization": "bearer disposable-job-secret"}})

    def test_auth_failure_diagnostics_distinguish_boundaries_without_credentials(self):
        tokens, calls = self.tokens([1000])
        upstream = []
        def reject(url, **kwargs):
            upstream.append(url)
            return 401, {}, b"disposable-upstream-response"
        diagnostics = io.StringIO()
        with redirect_stderr(diagnostics), server(tokens, reject) as (base, _):
            self.assertEqual(proxy.request(base + "/states/prod")[0], 401)
            self.assertIn("Terraform loopback authentication rejected", diagnostics.getvalue())
            self.assertFalse(calls)
            diagnostics.seek(0)
            diagnostics.truncate()
            self.assertEqual(proxy.request(base + "/states/prod", headers=AUTH)[0], 401)
            self.assertEqual(len(calls), 2)
            self.assertEqual(len(upstream), 2)
            self.assertIn("Remote state endpoint returned HTTP 401 after GitHub OIDC token refresh", diagnostics.getvalue())
            self.assertNotIn("Terraform loopback", diagnostics.getvalue())
        for sensitive in ("job-secret", "local-secret", jwt(1060), "disposable-upstream-response"):
            self.assertNotIn(sensitive, diagnostics.getvalue())

    def test_proxy_boundary_and_401_refresh(self):
        tokens, calls = self.tokens([1000])
        upstream = []
        def send(url, **kwargs):
            upstream.append((url, kwargs))
            return (401 if len(upstream) == 1 else 200), {"Location": "https://evil.invalid", "Set-Cookie": "secret"}, b"{}"
        with server(tokens, send) as (base, instance):
            self.assertEqual(instance.server_address[0], "127.0.0.1")
            self.assertEqual(proxy.request(base + "/states/prod", headers=AUTH)[0], 200)
            self.assertEqual(len(calls), 2)
            for path in ("/states/other", "/states/pr-43", "/states/prod?target=evil", "/states/prod/../prod"):
                self.assertEqual(proxy.request(base + path, headers=AUTH)[0], 400)
            self.assertEqual(proxy.request(base + "/states/prod")[0], 401)
            self.assertEqual(len(upstream), 2)
            self.assertTrue(all(url == proxy.STATE_URL + "/states/prod" for url, _ in upstream))
            self.assertNotIn("local-secret", upstream[0][1]["headers"]["Authorization"])
        with server(tokens, lambda *args, **kwargs: (307, {"Location": "https://evil.invalid"}, b"")) as (base, _):
            self.assertEqual(proxy.request(base + "/states/prod", headers=AUTH)[0], 502)

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
                        pending = pool.submit(network, base + "/states/prod", method="POST", data=b"state")
                        self.assertTrue(entered.wait(1))
                        if cancel:
                            network.cancel()
                        with self.assertRaises(proxy.RunnerError):
                            pending.result(timeout=.5)
                        # Even if the old worker eventually returns, a new
                        # unlock cannot overtake an ambiguous remote write.
                        release.set()
                        with self.assertRaises(proxy.RunnerError):
                            network(base + "/states/prod/lock", method="DELETE")
                        self.assertEqual(hits, ["/states/prod"])
                finally:
                    release.set()
                    instance.shutdown()
                    instance.server_close()
                    thread.join()

    def test_non_ci_runner_and_secure_recovery(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(proxy.sys, "argv", ["runner", "prod", "apply"]):
            with self.assertRaises(proxy.RunnerError):
                proxy.main()
        with tempfile.TemporaryDirectory() as temporary, patch.dict(os.environ, {"RUNNER_TEMP": temporary, "CLOUDFLARE_API_TOKEN": "local-recovery-secret"}):
            directory = Path(temporary) / "terraform"
            directory.mkdir()
            (directory / "errored.tfstate").write_text("sensitive-state")
            proxy.preserve_recovery(directory, "prod")
            artifact = next((Path(temporary) / "terraform-recovery/prod").glob("*.enc"))
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
                child = subprocess.Popen(["bash", str(infra / "terraform.sh"), "prod", "apply"], env=env,
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
                    encrypted = next((directory / "terraform-recovery/prod").glob("*.enc"))
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
                    env = {**os.environ, "TF_HTTP_ADDRESS": base + "/states/prod", "TF_HTTP_LOCK_ADDRESS": base + "/states/prod/lock",
                           "TF_HTTP_UNLOCK_ADDRESS": base + "/states/prod/lock", "TF_HTTP_PASSWORD": password, "CHECKPOINT_DISABLE": "1"}
                    for command in (["init", "-reconfigure", "-input=false"], arguments):
                        result = subprocess.run(["terraform", *command], cwd=directory, env=env, capture_output=True, timeout=30)
                        self.assertEqual(result.returncode, 0, result.stderr.decode())
            self.assertEqual(len(set(ports)), 3)
            self.assertTrue(json.loads(stored[0])["resources"])
            self.assertGreater(len(set(issued)), 1)
            self.assertEqual(requests[-1][0], "DELETE")
            self.assertFalse((directory / "errored.tfstate").exists())


class WorkflowTests(unittest.TestCase):
    def test_production_reconciles_and_previews_are_static(self):
        production = (ROOT / ".github/workflows/deploy.yaml").read_text()
        self.assertNotIn("event.before", production)
        self.assertNotIn("needs.changes", production)
        self.assertIn("needs: state-backend", production)
        self.assertIn("needs: infrastructure", production)
        for job in ("state-backend", "infrastructure"):
            body = re.split(r"\n  [a-z][a-z-]*:", production.split(f"  {job}:\n", 1)[1], maxsplit=1)[0]
            self.assertNotRegex(body, r"(?m)^    if:")
        preview = (ROOT / ".github/workflows/preview.yaml").read_text()
        self.assertNotIn("d1 ", preview)
        self.assertNotIn("AI_TOKEN_ENCRYPTION_KEY", preview)
        self.assertNotIn("VITE_WORKOS_CLIENT_ID", preview)
        self.assertIn("--config wrangler.preview.jsonc", preview)
        self.assertIn("needs.infrastructure.outputs.database_id", production)
        self.assertIn("needs.infrastructure.outputs.database_name", production)
        self.assertIn("--config dist/server/wrangler.json", production)
        for text in (production, preview):
            self.assertIn("terraform-recovery/**/*.enc", text)
            self.assertIn("terraform-recovery/**/*.hmac", text)
            self.assertIn("retention-days: 1", text)
