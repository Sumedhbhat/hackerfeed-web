terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.27.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "4.6.0"
    }
  }

  # Any Postgres database, read from PG_CONN_STR.
  backend "pg" {}
}

# Credentials come from CLOUDFLARE_API_TOKEN and DOCKER_HOST.
provider "cloudflare" {}
provider "docker" {}

# Each workspace is a stage: prod, or an isolated copy such as pr-42.
locals {
  stage       = terraform.workspace
  name        = local.stage == "prod" ? "hackerfeed-web" : "hackerfeed-web-${local.stage}"
  environment = local.stage == "prod" ? "production" : local.stage

  env = {
    VITE_APP_TITLE                 = "Hacker Feed"
    VITE_WORKOS_API_HOSTNAME       = "api.workos.com"
    VITE_WORKOS_REDIRECT_URI       = var.workos_redirect_uri
    VITE_SENTRY_ENVIRONMENT        = local.environment
    VITE_SENTRY_TRACES_SAMPLE_RATE = "0.1"
    SENTRY_ENVIRONMENT             = local.environment
    SENTRY_TRACES_SAMPLE_RATE      = "0.1"
    SENTRY_RELEASE                 = var.sentry_release
  }

  secrets = {
    for key, value in {
      VITE_WORKOS_CLIENT_ID   = var.workos_client_id
      AI_TOKEN_ENCRYPTION_KEY = var.ai_token_encryption_key
      SENTRY_DSN              = var.sentry_dsn
      VITE_SENTRY_DSN         = var.sentry_dsn
      CHATGPT_CLIENT_ID       = var.chatgpt_client_id
      CHATGPT_CLIENT_SECRET   = var.chatgpt_client_secret
    } : key => value if value != ""
  }
}

module "cloudflare" {
  source = "./cloudflare"
  count  = var.deploy_target == "cloudflare" ? 1 : 0

  account_id     = var.cloudflare_account_id
  name           = local.name
  env            = local.env
  secrets        = local.secrets
  seed_demo_data = startswith(local.stage, "pr-")
}

module "node" {
  source = "./node"
  count  = var.deploy_target == "node" ? 1 : 0

  name    = local.name
  port    = var.port
  env     = local.env
  secrets = local.secrets
}
