terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "0.14.2"
    }
  }

  # The deploy state, which only the production environment may read.
  backend "http" {
    lock_method   = "POST"
    unlock_method = "DELETE"
    username      = "github"
  }
}

# Credentials come from CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

variable "cloudflare_account_id" {
  type = string
}

# Production migrations and Worker deploys.
module "deploy_token" {
  source      = "../modules/ci-token"
  account_id  = var.cloudflare_account_id
  name        = "hackerfeed-ci-deploy"
  permissions = ["Workers Scripts Write", "D1 Write"]
}

output "deploy_token" {
  value     = module.deploy_token.value
  sensitive = true
}
