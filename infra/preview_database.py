#!/usr/bin/env python3
"""Adopt databases made by the pre-Terraform preview workflow. Import changes state only."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlencode

# Reuse the redirect-free HTTP client; never forward the Cloudflare API token.
from state_proxy import request

DATABASE = "cloudflare_d1_database.this"
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
PROTECTED_IDS = {"61e6cb7a-29b4-43b6-85af-e82d735a9ed8", "4089bb3b-d856-46c8-87af-7bdbef8eefd8"}


def managed_database(state, stage, account):
    if not isinstance(state, dict) or state.get("format_version") != "1.0":
        raise ValueError("Invalid Terraform state JSON")
    if "values" not in state:
        if set(state) != {"format_version"}:
            raise ValueError("Unexpected empty Terraform state")
        return False
    values = state["values"]
    if not isinstance(values, dict) or not isinstance(values.get("root_module"), dict):
        raise ValueError("Invalid Terraform state values")
    root = values["root_module"]
    resources = root.get("resources", [])
    if not isinstance(resources, list) or root.get("child_modules"):
        raise ValueError("Unexpected preview state modules")
    if not resources:
        return False
    if len(resources) != 1:
        raise ValueError("Unexpected preview state resources")
    db = resources[0]
    attributes = db.get("values", {})
    if (db.get("address") != DATABASE or db.get("type") != "cloudflare_d1_database" or
            db.get("mode") != "managed" or attributes.get("name") != f"hackerfeed-web-{stage}" or
            attributes.get("account_id") != account or not UUID.fullmatch(attributes.get("id", "")) or
            attributes["id"] in PROTECTED_IDS):
        raise ValueError("Preview state does not match the exact stage database")
    return True


def discover(stage, account, token, send=request):
    matches = []
    # Same pagination as wrangler d1 list; an error on ANY page is fatal.
    for page in range(1, 10001):
        url = f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database?" + urlencode(
            {"page": page, "per_page": 100})
        status, _, body = send(url, headers={"Authorization": f"Bearer {token}"})
        data = json.loads(body)
        if status != 200 or not isinstance(data, dict) or data.get("success") is not True:
            raise ValueError("Cloudflare database inventory failed")
        rows = data.get("result")
        if not isinstance(rows, list) or not all(isinstance(row, dict) and
                isinstance(row.get("name"), str) and isinstance(row.get("uuid"), str) for row in rows):
            raise ValueError("Invalid Cloudflare database inventory")
        matches.extend(row for row in rows if row["name"] == f"hackerfeed-web-{stage}")
        if len(rows) < 100:
            break
    else:
        raise ValueError("Cloudflare database inventory did not finish")
    if len(matches) > 1:
        raise ValueError("Multiple databases match the exact preview name")
    if not matches:
        return None
    identifier = matches[0]["uuid"]
    if not UUID.fullmatch(identifier) or identifier in PROTECTED_IDS:
        raise ValueError("Invalid or protected preview database ID")
    return identifier


def main():
    stage = sys.argv[1]
    account = os.environ["TF_VAR_cloudflare_account_id"]
    if not re.fullmatch(r"pr-[1-9][0-9]*", stage) or not re.fullmatch(r"[0-9a-f]{32}", account):
        raise ValueError("Expected an exact PR stage and Cloudflare account ID")
    wrapper = str(Path(__file__).with_name("terraform.sh"))
    def terraform(*args):
        return subprocess.check_output([wrapper, stage, *args])
    exists = managed_database(json.loads(terraform("show", "-json")), stage, account)
    imported = False
    if not exists:
        identifier = discover(stage, account, os.environ["CLOUDFLARE_API_TOKEN"])
        if identifier:
            # Import changes only state, never the database. Import errors are fatal.
            terraform("import", "-input=false", DATABASE, f"{account}/{identifier}")
            if not managed_database(json.loads(terraform("show", "-json")), stage, account):
                raise ValueError("Preview import did not populate state")
            exists, imported = True, True
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"exists={str(exists).lower()}\nimported={str(imported).lower()}\n")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Preview adoption failed; state and full database inventory must be readable and match the PR.", file=sys.stderr)
        sys.exit(1)
