# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — OpenSearch Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs (first 2 used for zone awareness)"
  type        = list(string)
}

variable "opensearch_sg_id" {
  description = "Security group ID for OpenSearch"
  type        = string
}

variable "instance_type" {
  description = "OpenSearch instance type"
  type        = string
  default     = "t3.small.search"
}

variable "master_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}
