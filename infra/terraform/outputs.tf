output "url" {
  value = one(concat(module.cloudflare[*].url, module.node[*].url))
}
