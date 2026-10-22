#!/usr/bin/env python3
"""Accept only a Terraform plan with valid change records and no D1 deletion."""
import json
import re
import sys


def validate(plan):
    if (not isinstance(plan, dict) or
            not isinstance(plan.get("format_version"), str) or
            not re.fullmatch(r"1\.\d+", plan["format_version"]) or
            not isinstance(plan.get("terraform_version"), str) or
            not re.fullmatch(r"1\.\d+\.\d+.*", plan["terraform_version"]) or
            not isinstance(plan.get("planned_values"), dict) or
            not isinstance(plan.get("configuration"), dict) or
            not isinstance(plan["configuration"].get("root_module"), dict) or
            plan.get("errored", False) is not False):
        raise ValueError("Not a supported Terraform plan")
    changes = plan.get("resource_changes")
    if not isinstance(changes, list):
        raise ValueError("Invalid resource changes")
    actions = (["no-op"], ["create"], ["read"], ["update"], ["delete"],
               ["delete", "create"], ["create", "delete"], ["forget"], ["create", "forget"])
    for resource in changes:
        if (not isinstance(resource, dict) or
                not all(isinstance(resource.get(key), str) and resource[key]
                        for key in ("address", "type", "name")) or
                resource.get("mode") not in ("managed", "data") or
                not isinstance(resource.get("change"), dict) or
                resource["change"].get("actions") not in actions):
            raise ValueError("Invalid resource change")
        if resource["type"] == "cloudflare_d1_database" and any(
                action in ("delete", "forget") for action in resource["change"]["actions"]):
            raise ValueError("The plan deletes, replaces, or forgets a production D1 database")


if __name__ == "__main__":
    try:
        with open(sys.argv[1]) as source:
            validate(json.load(source))
    except (ValueError, TypeError, KeyError, OSError, IndexError) as error:
        print(f"Production plan rejected: {error}", file=sys.stderr)
        sys.exit(1)
