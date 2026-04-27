# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — VPC Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
