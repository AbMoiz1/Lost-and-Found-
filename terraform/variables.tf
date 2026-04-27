# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Root Variables
# ─────────────────────────────────────────────────────────────────────────────
# SA EXAM NOTE: Variables make your Terraform code reusable across environments.
# You define them here, set values in .tfvars files (dev.tfvars, prod.tfvars),
# and reference them as var.project, var.environment, etc.
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
  description = "Primary AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery region for cross-region replicas"
  type        = string
  default     = "us-west-2"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC (/16 gives 65,536 IPs)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Domain name for the application (e.g., lostandfound.com)"
  type        = string
  default     = ""
}

variable "opensearch_master_password" {
  description = "Master password for OpenSearch admin user"
  type        = string
  sensitive   = true
  default     = "M0iz!Search#2024x"
}

variable "sender_email" {
  description = "Sender email for SES (must be verified in sandbox mode)"
  type        = string
  default     = "noreply@lostandfound.com"
}
