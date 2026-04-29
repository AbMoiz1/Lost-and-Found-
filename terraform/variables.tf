# ─────────────────────────────────────────────────────────────────────────────
# Lost and Found — Serverless Root Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
  default     = "moiz-lost-and-found"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "db_master_password" {
  description = "Master password for Aurora Serverless v2"
  type        = string
  sensitive   = true
  default     = "M0iz!Aurora#2024x"
}

variable "sender_email" {
  description = "Sender email for SES notifications"
  type        = string
  default     = "noreply@lostandfound.com"
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "AbMoiz1/Lost-and-Found-w"
}
