variable "deploy_target" {
  description = "Host to deploy to; the same value as the build's DEPLOY_TARGET."
  type        = string
  default     = "node"

  validation {
    condition     = contains(["cloudflare", "node"], var.deploy_target)
    error_message = "deploy_target must be cloudflare or node."
  }
}

variable "cloudflare_account_id" {
  type    = string
  default = null
}

variable "port" {
  description = "Host port the node container listens on."
  type        = number
  default     = 3000
}

variable "workos_redirect_uri" {
  type = string
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

variable "chatgpt_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "chatgpt_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}
