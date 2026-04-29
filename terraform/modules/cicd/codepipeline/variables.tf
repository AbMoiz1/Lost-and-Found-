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
