variable "cloudflare_account_id" {
  type = string
}

# Overrides wrangler.jsonc's vars, e.g. a PR stage's VITE_WORKOS_REDIRECT_URI.
variable "vars" {
  type    = map(string)
  default = {}
}

variable "workos_client_id" {
  type      = string
  sensitive = true
}

variable "ai_token_encryption_key" {
  type      = string
  sensitive = true
}

variable "sentry_dsn" {
  type      = string
  sensitive = true
  default   = ""
}

variable "sentry_release" {
  type    = string
  default = ""
}
