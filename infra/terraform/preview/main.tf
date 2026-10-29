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

  # The preview state. Only the Rotate preview token workflow applies it; PR
  # jobs read the token from it.
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

# PR version uploads and the PR plan of ./ (D1 Read). Rotated by hand: the
# Rotate preview token workflow replaces it, and nothing else applies this root.
module "preview_token" {
  source        = "../modules/ci-token"
  account_id    = var.cloudflare_account_id
  name          = "hackerfeed-ci-preview"
  permissions   = ["Workers Scripts Write", "D1 Read"]
  rotation_days = 90
  expiry_days   = 90
}

output "preview_token" {
  value     = module.preview_token.value
  sensitive = true
}
