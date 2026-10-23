output "database_id" {
  value = cloudflare_d1_database.this.id
}

output "database_name" {
  value = cloudflare_d1_database.this.name
}

output "preview_token" {
  value     = module.preview_token.value
  sensitive = true
}
