# prod, or a pull request's preview such as pr-42. Each stage has its own state.
variable "stage" {
  type = string

  validation {
    condition     = can(regex("^(prod|pr-[1-9][0-9]*)$", var.stage))
    error_message = "stage must be prod or pr-<number>."
  }
}

variable "cloudflare_account_id" {
  type = string
}
