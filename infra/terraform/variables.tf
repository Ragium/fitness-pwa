variable "project_id" {
  type        = string
  description = "Firebase/GCP project id that owns the Hosting site."
  default     = "fittracker-dev"
}

variable "hosting_site_id" {
  type        = string
  description = "Firebase Hosting site id (visible in the Firebase console)."
  default     = "fittracker-app"
}

variable "preview_channel" {
  type        = string
  description = "Preview channel used for sprint smoke builds."
  default     = "preview"
}

variable "base_url" {
  type        = string
  description = "Base URL where the preview artifacts are served."
  default     = "https://preview.fittracker.app"
}

variable "smoke_path" {
  type        = string
  description = "Path for smoke probes."
  default     = "/"
}

variable "build_command" {
  type        = string
  description = "Command executed by CI to produce the deployable artifacts."
  default     = "cd ../../fittracker && npm ci && npm run build"
}

variable "deploy_command" {
  type        = string
  description = "Optional override for the Firebase CLI preview deploy command."
  default     = ""
}
