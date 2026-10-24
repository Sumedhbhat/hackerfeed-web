terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.27.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "0.14.2"
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
# The only database UUID here bootstraps adoption of the existing database.
# Deployments read its current identity from Terraform outputs.
import {
  to = cloudflare_d1_database.this
  id = "${var.cloudflare_account_id}/61e6cb7a-29b4-43b6-85af-e82d735a9ed8"
}

resource "cloudflare_d1_database" "this" {
  account_id       = var.cloudflare_account_id
  name             = "hackerfeed"
  read_replication = { mode = "disabled" }
}

# PR jobs read this state: the preview token uploads demo versions and plans
# this root. Production-only tokens belong in ./deploy.
module "preview_token" {
  source      = "./modules/ci-token"
  account_id  = var.cloudflare_account_id
  name        = "hackerfeed-ci-preview"
  permissions = ["Workers Scripts Write", "D1 Read", "Account API Tokens Read"]
}
