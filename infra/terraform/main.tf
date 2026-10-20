terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.27.0"
    }
  }

  # The state server in infra/state-backend. infra/terraform.sh sets the
  # stage's address and signs in with the job's GitHub OIDC token.
  backend "http" {
    lock_method   = "POST"
    unlock_method = "DELETE"
    username      = "github"
  }
}

# Credentials come from CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

# Terraform creates resources only. Wrangler deploys the Worker and its
# settings from wrangler.jsonc, and CI applies migrations.
locals {
  stage = var.stage
  # The production database predates Terraform and is named hackerfeed.
  database_name = local.stage == "prod" ? "hackerfeed" : "hackerfeed-web-${local.stage}"
}

# Adopts the existing production database on the first prod apply. The id is
# the DB binding's database_id in wrangler.jsonc.
import {
  for_each = local.stage == "prod" ? toset(["prod"]) : toset([])
  to       = cloudflare_d1_database.this
  id       = "${var.cloudflare_account_id}/61e6cb7a-29b4-43b6-85af-e82d735a9ed8"
}

resource "cloudflare_d1_database" "this" {
  account_id       = var.cloudflare_account_id
  name             = local.database_name
  read_replication = { mode = "disabled" }
}
