terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

variable "account_id" {
  type = string
}

variable "name" {
  type = string
}

variable "env" {
  type = map(string)
}

variable "secrets" {
  type      = map(string)
  sensitive = true
}

variable "seed_demo_data" {
  type = bool
}

locals {
  root       = abspath("${path.module}/../../..")
  server     = "${local.root}/.output/server"
  migrations = sha256(join("", [for file in sort(fileset(local.root, "migrations/*.sql")) : filesha256("${local.root}/${file}")]))
  demo_data  = sha256(join("", [for file in sort(fileset(local.root, "src/demo-data/**")) : filesha256("${local.root}/${file}")]))
}

resource "cloudflare_d1_database" "this" {
  account_id       = var.account_id
  name             = var.name
  read_replication = { mode = "disabled" }
}

# scripts/db.ts keeps the d1_migrations ledger the node target reads, so the
# database stays portable. Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
resource "terraform_data" "migrate" {
  triggers_replace = [cloudflare_d1_database.this.id, local.migrations]

  provisioner "local-exec" {
    command     = "bun scripts/db.ts migrate"
    working_dir = local.root
    environment = { D1_DATABASE_ID = cloudflare_d1_database.this.id }
  }
}

resource "terraform_data" "seed_demo_data" {
  count            = var.seed_demo_data ? 1 : 0
  triggers_replace = [terraform_data.migrate.id, local.demo_data]

  provisioner "local-exec" {
    command     = "bun scripts/demo-data-sql.ts > .output/demo-data.sql && bun scripts/db.ts exec .output/demo-data.sql"
    working_dir = local.root
    environment = { D1_DATABASE_ID = cloudflare_d1_database.this.id }
  }
}

resource "cloudflare_worker" "this" {
  account_id = var.account_id
  name       = var.name
  subdomain  = { enabled = true }

  observability = {
    enabled = true
    logs    = { enabled = true, invocation_logs = true }
    traces  = { enabled = true }
  }
}

# Nitro's .output, uploaded module by module as built.
resource "cloudflare_worker_version" "this" {
  account_id          = var.account_id
  worker_id           = cloudflare_worker.this.id
  compatibility_date  = "2025-09-02"
  compatibility_flags = ["nodejs_compat"]
  main_module         = "index.mjs"
  deploy              = true

  modules = [
    for file in fileset(local.server, "**/*.mjs") : {
      name         = file
      content_type = "application/javascript+module"
      content_file = "${local.server}/${file}"
    }
  ]

  assets = { directory = "${local.root}/.output/public" }

  bindings = concat(
    [
      { type = "d1", name = "DB", id = cloudflare_d1_database.this.id },
      { type = "assets", name = "ASSETS" },
    ],
    [for key, value in var.env : { type = "plain_text", name = key, text = value }],
    [for key, value in var.secrets : { type = "secret_text", name = key, text = value }],
  )

  depends_on = [terraform_data.migrate]
}

resource "cloudflare_workers_cron_trigger" "this" {
  account_id  = var.account_id
  script_name = cloudflare_worker.this.name
  schedules   = [{ cron = "30 23 * * *" }]

  depends_on = [cloudflare_worker_version.this]
}

output "url" {
  value = "https://${cloudflare_worker.this.subdomain.url}"
}
