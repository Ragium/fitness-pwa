locals {
  preview_channel_id  = "${var.hosting_site_id}:${var.preview_channel}"
  resolved_deploy_cmd = var.deploy_command != "" ? var.deploy_command : "firebase hosting:channel:deploy ${var.preview_channel} --project ${var.project_id}"
  metadata = {
    project_id      = var.project_id
    hosting_site    = var.hosting_site_id
    preview_channel = var.preview_channel
    base_url        = var.base_url
    smoke_path      = var.smoke_path
    build_command   = var.build_command
    deploy_command  = local.resolved_deploy_cmd
  }
}

resource "local_file" "hosting_manifest" {
  filename = "${path.module}/generated/hosting-preview.json"
  content  = jsonencode(local.metadata)
}

output "preview_channel_reference" {
  description = "Identifier of the Firebase Hosting preview channel tracked by this config."
  value       = local.preview_channel_id
}

output "smoke_target_url" {
  description = "Resolved URL that smoke tests should verify."
  value       = "${var.base_url}${var.smoke_path}"
}
