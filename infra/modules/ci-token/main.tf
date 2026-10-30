terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
    time = {
      source = "hashicorp/time"
    }
  }
}

variable "account_id" {
  type = string
}

variable "name" {
  type = string
}

# Account permission group names, e.g. "D1 Read".
variable "permissions" {
  type = list(string)
}

data "cloudflare_account_api_token_permission_groups_list" "account" {
  account_id = var.account_id
  scope      = "com.cloudflare.api.account"
}

# The first production run after 30 days replaces the token. It expires after
# 90, so a token only lapses if production goes that long without a run.
resource "time_rotating" "this" {
  rotation_days = 30
}

resource "cloudflare_account_token" "this" {
  account_id = var.account_id
  name       = var.name
  expires_on = timeadd(time_rotating.this.rfc3339, "2160h")

  policies = [{
    effect = "allow"
    permission_groups = [for permission in var.permissions : {
      id = one([
        for group in data.cloudflare_account_api_token_permission_groups_list.account.result :
        group.id if group.name == permission
      ])
    }]
    resources = jsonencode({
      "com.cloudflare.api.account.${var.account_id}" = "*"
    })
  }]

  lifecycle {
    create_before_destroy = true
    replace_triggered_by  = [time_rotating.this]
  }
}

output "value" {
  value     = cloudflare_account_token.this.value
  sensitive = true
}
