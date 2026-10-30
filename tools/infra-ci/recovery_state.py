#!/usr/bin/env python3
"""Encrypt CI recovery artifacts; authenticate before decrypting for recovery."""
import hashlib
import hmac
import os
from pathlib import Path
import subprocess
import sys


def tag(path, credential):
    key = hmac.digest(credential.encode(), b"hackerfeed terraform recovery authentication v1", "sha256")
    signature = hmac.new(key, digestmod=hashlib.sha256)
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            signature.update(block)
    return signature.hexdigest()


def crypt(source, destination, *, decrypt=False):
    credential = os.environ["CLOUDFLARE_API_TOKEN"]
    if not credential:
        raise ValueError("Recovery requires the original job's Cloudflare API token")
    signature = Path(str(source) + ".hmac")
    if decrypt and not hmac.compare_digest(signature.read_text().strip(), tag(source, credential)):
        raise ValueError("Recovery artifact authentication failed")
    arguments = ["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "600000", "-md", "sha256",
                 "-pass", "env:CLOUDFLARE_API_TOKEN", "-in", str(source)]
    if decrypt:
        arguments.append("-d")
    # Exclusive mode avoids clobbering any prior recovery; permissions are private.
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as output:
            subprocess.run(arguments, stdout=output, stderr=subprocess.DEVNULL, check=True)
        if not decrypt:
            Path(str(destination) + ".hmac").write_text(tag(destination, credential) + "\n")
    except Exception:
        destination.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    os.umask(0o077)
    try:
        if len(sys.argv) != 3:
            raise ValueError("Usage: recovery_state.py <errored.tfstate.enc> <recovered.tfstate>")
        crypt(Path(sys.argv[1]), Path(sys.argv[2]), decrypt=True)
    except Exception:
        print("Recovery failed: verify the artifact and original job credential; no state was printed.", file=sys.stderr)
        sys.exit(1)
