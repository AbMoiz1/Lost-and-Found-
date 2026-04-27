# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — S3 Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}
