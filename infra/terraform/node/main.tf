terraform {
  required_providers {
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

variable "name" {
  type = string
}

variable "port" {
  type = number
}

variable "env" {
  type = map(string)
}

variable "secrets" {
  type      = map(string)
  sensitive = true
}

locals {
  root = abspath("${path.module}/../../..")
}

resource "docker_image" "this" {
  name = "${var.name}:latest"

  build {
    context = local.root
    build_args = {
      VITE_WORKOS_REDIRECT_URI = var.env.VITE_WORKOS_REDIRECT_URI
      VITE_WORKOS_CLIENT_ID    = var.secrets.VITE_WORKOS_CLIENT_ID
      VITE_SENTRY_DSN          = lookup(var.secrets, "VITE_SENTRY_DSN", "")
    }
  }

  triggers = {
    source = sha256(join("", [for file in sort(fileset(local.root, "{src,migrations,public}/**")) : filesha256("${local.root}/${file}")]))
    lock   = filesha256("${local.root}/bun.lock")
  }
}

resource "docker_volume" "data" {
  name = "${var.name}-data"
}

resource "docker_container" "this" {
  name    = var.name
  image   = docker_image.this.image_id
  restart = "unless-stopped"
  env     = [for key, value in merge(var.env, var.secrets) : "${key}=${value}"]

  ports {
    internal = 3000
    external = var.port
  }

  volumes {
    volume_name    = docker_volume.data.name
    container_path = "/data"
  }
}

output "url" {
  value = "http://localhost:${var.port}"
}
