#!/usr/bin/env python3
"""Run Terraform behind a job-local HTTP backend with renewable GitHub OIDC."""

import base64
import hmac
import json
import math
import os
import re
import secrets
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from recovery_state import crypt
from commands import Commands

STATE_URL = "https://hackerfeed-terraform-state.kgqk4vdcfq.workers.dev"
STAGE = re.compile(r"^(prod|pr-[1-9][0-9]*)$")


class RunnerError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


# Neither job credentials nor backend credentials may follow redirects or proxies.
HTTP = build_opener(ProxyHandler({}), NoRedirect())


def request(url, *, headers=None, data=None, method="GET"):
    try:
        response = HTTP.open(Request(url, data=data, headers=headers or {}, method=method), timeout=60)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


class Tokens:
    def __init__(self, url, credential, audience=STATE_URL, clock=time.time, send=request):
        parts = urlsplit(url)
        if (parts.scheme != "https" or not parts.hostname or
                not parts.hostname.endswith(".actions.githubusercontent.com") or
                parts.username or parts.password or parts.fragment or parts.port not in (None, 443)):
            raise ValueError("Unexpected GitHub OIDC endpoint")
        query = parse_qs(parts.query)
        query["audience"] = [audience]
        self.url = urlunsplit(parts._replace(query=urlencode(query, doseq=True)))
        self.credential, self.audience = credential, audience
        self.clock, self.send = clock, send
        self.token, self.expires = "", 0
        self.lock = threading.Lock()

    def get(self, rejected=None):
        with self.lock:
            if self.token and self.clock() < self.expires - 30 and self.token != rejected:
                return self.token
            status, _, body = self.send(self.url, headers={"Authorization": f"bearer {self.credential}"})
            if status != 200:
                raise ValueError("OIDC request failed")
            token = json.loads(body)["value"]
            if not isinstance(token, str) or len(token.split(".")) != 3:
                raise ValueError("Invalid OIDC response")
            payload = token.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            expiry = claims.get("exp")
            if (not isinstance(expiry, (int, float)) or isinstance(expiry, bool) or
                    not math.isfinite(expiry) or expiry <= self.clock() or claims.get("aud") != self.audience):
                raise ValueError("Invalid OIDC claims")
            # The Worker verifies the signature, issuer, repository and permissions.
            self.token, self.expires = token, expiry
            return token


def make_server(stage, password, tokens, send=request):
    path = f"/states/{stage}"
    authorization = "Basic " + base64.b64encode(f"github:{password}".encode()).decode()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass  # Request bodies and credentials must never enter logs.

        def handle_request(self):
            if not hmac.compare_digest(self.headers.get("Authorization", "").encode(), authorization.encode()):
                self.send_error(401)
                return
            url = urlsplit(self.path)
            query = parse_qs(url.query, keep_blank_values=True)
            if (url.scheme or url.netloc or url.fragment or url.path not in (path, path + "/lock") or
                    any(key != "ID" or len(value) != 1 for key, value in query.items()) or
                    self.command not in ("GET", "POST", "DELETE")):
                self.send_error(400)
                return
            try:
                if self.headers.get("Transfer-Encoding"):
                    raise ValueError("Unsupported request framing")
                length = int(self.headers.get("Content-Length", "0"))
                if length < 0:
                    raise ValueError("Invalid body length")
                body = self.rfile.read(length) if length else None
                token = tokens.get()
                for attempt in range(2):
                    upstream_auth = base64.b64encode(f"github:{token}".encode()).decode()
                    status, headers, data = send(
                        STATE_URL + url.path + ("?" + url.query if url.query else ""),
                        method=self.command, data=body,
                        headers={"Authorization": "Basic " + upstream_auth, "Content-Type": "application/json"},
                    )
                    if status != 401 or attempt:
                        break
                    token = tokens.get(rejected=token)
                # Do not forward Location, cookies, or any other upstream headers.
                self.send_response(502 if 300 <= status < 400 else status)
                self.send_header("Content-Type", headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception:
                self.send_error(502, "State backend or OIDC request failed")

        do_GET = do_POST = do_DELETE = do_PUT = do_PATCH = do_HEAD = handle_request

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    return server


def preserve_recovery(directory, stage):
    recovery = directory / "errored.tfstate"
    if recovery.is_file():
        recovery.chmod(0o600)
        target = Path(os.environ["RUNNER_TEMP"]) / "terraform-recovery" / stage
        target.mkdir(parents=True, exist_ok=True, mode=0o700)
        target.chmod(0o700)
        # Unique files avoid overwriting an earlier failure in this job.
        filename = target / ("errored-" + secrets.token_hex(12) + ".tfstate.enc")
        crypt(recovery, filename)
        print("Encrypted Terraform recovery state saved for CI artifact (1 day retention).", file=sys.stderr)


def main():
    stage, command, *args = sys.argv[1:]
    if not STAGE.fullmatch(stage) or (stage == "prod" and command in ("destroy", "delete-state")):
        raise RunnerError("Invalid stage or forbidden production destruction")
    if (os.environ.get("GITHUB_ACTIONS") != "true" or not os.environ.get("RUNNER_TEMP") or
            not os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")):
        raise RunnerError("Run in GitHub Actions with id-token: write")
    tokens = Tokens(os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"], os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"])
    password = secrets.token_urlsafe(32)
    server = make_server(stage, password, tokens)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    address = f"http://127.0.0.1:{server.server_port}/states/{stage}"
    env = {key: value for key, value in os.environ.items() if not key.startswith("TF_HTTP_") and
           not key.startswith("ACTIONS_ID_TOKEN_REQUEST_")}
    env.update(TF_HTTP_PASSWORD=password, TF_HTTP_USERNAME="github", TF_VAR_stage=stage,
               TF_HTTP_ADDRESS=address, TF_HTTP_LOCK_ADDRESS=address + "/lock",
               TF_HTTP_UNLOCK_ADDRESS=address + "/lock")
    directory = Path(__file__).resolve().parent / "terraform"
    with Commands() as commands:
        try:
            if (directory / "errored.tfstate").exists():
                raise RunnerError("Existing errored.tfstate requires recovery before another Terraform command")
            if command == "delete-state":
                auth = base64.b64encode(f"github:{password}".encode()).decode()
                status, _, _ = request(address, method="DELETE", headers={"Authorization": "Basic " + auth})
                return 0 if status == 200 else 1
            # Environment-only addresses stay out of saved plans, which another
            # invocation applies through a new ephemeral port and password.
            result = commands.run(["terraform", "init", "-input=false", "-reconfigure"],
                                  cwd=directory, env=env, stdout=subprocess.DEVNULL)
            if result.returncode:
                return result.returncode
            return commands.run(["terraform", command, *args], cwd=directory, env=env).returncode
        finally:
            commands.finishing = True
            try:
                preserve_recovery(directory, stage)
            finally:
                server.shutdown()
                server.server_close()
                thread.join()


if __name__ == "__main__":
    os.umask(0o077)
    try:
        sys.exit(main())
    except RunnerError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Exceptions from HTTP clients may contain bearer tokens or state bodies.
        print("Terraform runner failed; check CI permissions, OIDC and state backend availability.", file=sys.stderr)
        sys.exit(1)
