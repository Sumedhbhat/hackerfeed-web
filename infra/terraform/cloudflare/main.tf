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

# Only production has a D1 database and the cron trigger. A preview is a
# Worker whose build serves src/demo-data from memory.
variable "prod" {
  type = bool
}

locals {
  root       = abspath("${path.module}/../../..")
  server     = "${local.root}/.output/server"
  migrations = sha256(join("", [for file in sort(fileset(local.root, "migrations/*.sql")) : filesha256("${local.root}/${file}")]))
}

# The production database predates Terraform and is named hackerfeed.
resource "cloudflare_d1_database" "this" {
  count            = var.prod ? 1 : 0
  account_id       = var.account_id
  name             = "hackerfeed"
  read_replication = { mode = "disabled" }

  lifecycle {
    prevent_destroy = true
  }
}

# scripts/db.ts keeps the d1_migrations ledger the node target reads, so the
# database stays portable. Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
resource "terraform_data" "migrate" {
  count            = var.prod ? 1 : 0
  triggers_replace = [cloudflare_d1_database.this[0].id, local.migrations]

  provisioner "local-exec" {
    command     = "bun scripts/db.ts migrate"
    working_dir = local.root
    environment = { D1_DATABASE_ID = cloudflare_d1_database.this[0].id }
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

# Nitro's .output, uploaded module by module as built. Preview builds also hold
# sql.js's WebAssembly module.
resource "cloudflare_worker_version" "this" {
  account_id          = var.account_id
  worker_id           = cloudflare_worker.this.id
  compatibility_date  = "2025-09-02"
  compatibility_flags = ["nodejs_compat"]
  main_module         = "index.mjs"
  deploy              = true

  modules = [
    for file in fileset(local.server, "**/*.{mjs,wasm}") : {
      name         = file
      content_type = endswith(file, ".wasm") ? "application/wasm" : "application/javascript+module"
      content_file = "${local.server}/${file}"
    }
  ]

  assets = { directory = "${local.root}/.output/public" }

  bindings = concat(
    [{ type = "assets", name = "ASSETS" }],
    [for db in cloudflare_d1_database.this : { type = "d1", name = "DB", id = db.id }],
    [for key, value in var.env : { type = "plain_text", name = key, text = value }],
    [for key, value in var.secrets : { type = "secret_text", name = key, text = value }],
  )

  depends_on = [terraform_data.migrate]
}

resource "cloudflare_workers_cron_trigger" "this" {
  count       = var.prod ? 1 : 0
  account_id  = var.account_id
  script_name = cloudflare_worker.this.name
  schedules   = [{ cron = "30 23 * * *" }]

  depends_on = [cloudflare_worker_version.this]
}

output "url" {
  value = "https://${cloudflare_worker.this.subdomain.url}"
}
