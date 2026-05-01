variable "project" { type = string }
variable "environment" {
  type    = string
  default = "dev"
}
variable "github_repo" {
  description = "GitHub repo in format owner/repo"
  type        = string
}
variable "github_branch" {
  description = "Branch to trigger pipeline on"
  type        = string
  default     = "serverless-deployment"
}

variable "webhook_secret" {
  description = "Secret token for GitHub webhook HMAC validation"
  type        = string
  sensitive   = true
  default     = "lost-and-found-webhook-secret-2024"
}
