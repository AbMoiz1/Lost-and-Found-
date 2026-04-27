# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Security Groups Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where security groups will be created"
  type        = string
}
