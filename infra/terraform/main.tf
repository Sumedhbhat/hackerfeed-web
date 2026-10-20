terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.27.0"
    }
  }

  # Any Postgres database, read from PG_CONN_STR.
  backend "pg" {}
}

# Credentials come from CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

# Each workspace is a stage: prod, or a PR preview such as pr-42. Only prod
# has a database and a cron trigger; previews are a Worker serving the demo
# data built into it (src/demo-data/README.md).
locals {
  stage = terraform.workspace
  prod  = local.stage == "prod"
  name  = local.prod ? "hackerfeed-web" : "hackerfeed-web-${local.stage}"
  root  = abspath("${path.module}/../..")

  # `bun run build` writes the Worker to dist/server and wrangler.jsonc's
  # settings to dist/server/wrangler.json, so wrangler.jsonc stays the one
  # place they live.
  server   = "${local.root}/dist/server"
  wrangler = jsondecode(file("${local.server}/wrangler.json"))
  prod_db  = one([for db in local.wrangler.d1_databases : db.database_id if db.binding == "DB"])

  vars = merge(local.wrangler.vars, var.vars, {
    SENTRY_RELEASE = var.sentry_release
  })

  secrets = {
    for key, value in {
      VITE_WORKOS_CLIENT_ID   = var.workos_client_id
      AI_TOKEN_ENCRYPTION_KEY = var.ai_token_encryption_key
      SENTRY_DSN              = var.sentry_dsn
      VITE_SENTRY_DSN         = var.sentry_dsn
    } : key => value if value != ""
  }

  migrations = sha256(join("", [for file in sort(fileset(local.root, "migrations/*.sql")) : filesha256("${local.root}/${file}")]))
}

# Production existed before Terraform; these adopt it on the first prod apply.
import {
  for_each = local.prod ? toset(["prod"]) : toset([])
  to       = cloudflare_d1_database.prod[0]
  id       = "${var.cloudflare_account_id}/${local.prod_db}"
}

import {
  for_each = local.prod ? toset(["prod"]) : toset([])
  to       = cloudflare_worker.this
  id       = "${var.cloudflare_account_id}/hackerfeed-web"
}

# The production database predates Terraform and is named hackerfeed.
resource "cloudflare_d1_database" "prod" {
  count            = local.prod ? 1 : 0
  account_id       = var.cloudflare_account_id
  name             = "hackerfeed"
  read_replication = { mode = "disabled" }

  lifecycle {
    prevent_destroy = true
  }
}

# wrangler.jsonc binds DB to the production database. Needs
# CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
resource "terraform_data" "migrate" {
  count            = local.prod ? 1 : 0
  triggers_replace = [cloudflare_d1_database.prod[0].id, local.migrations]

  provisioner "local-exec" {
    command     = "bunx wrangler d1 migrations apply DB --remote"
    working_dir = local.root
  }
}

resource "cloudflare_worker" "this" {
  account_id = var.cloudflare_account_id
  name       = local.name
  subdomain  = { enabled = true }

  observability = {
    enabled            = local.wrangler.observability.enabled
    head_sampling_rate = local.wrangler.observability.head_sampling_rate
    logs               = { enabled = true, invocation_logs = true }
    traces             = local.wrangler.observability.traces
  }
}

resource "cloudflare_worker_version" "this" {
  account_id          = var.cloudflare_account_id
  worker_id           = cloudflare_worker.this.id
  compatibility_date  = local.wrangler.compatibility_date
  compatibility_flags = local.wrangler.compatibility_flags
  main_module         = local.wrangler.main
  deploy              = true

  # Preview builds also hold sql.js's WebAssembly module.
  modules = [
    for file in fileset(local.server, "**/*.{js,wasm}") : {
      name         = file
      content_type = endswith(file, ".wasm") ? "application/wasm" : "application/javascript+module"
      content_file = "${local.server}/${file}"
    }
  ]

  assets = { directory = "${local.root}/dist/client" }

  bindings = concat(
    [for db in cloudflare_d1_database.prod : { type = "d1", name = "DB", id = db.id }],
    [for key, value in local.vars : { type = "plain_text", name = key, text = value }],
    [for key, value in local.secrets : { type = "secret_text", name = key, text = value }],
  )

  depends_on = [terraform_data.migrate]
}

resource "cloudflare_workers_cron_trigger" "this" {
  count       = local.prod ? 1 : 0
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_worker.this.name
  schedules   = [for cron in local.wrangler.triggers.crons : { cron = cron }]

  depends_on = [cloudflare_worker_version.this]
}
