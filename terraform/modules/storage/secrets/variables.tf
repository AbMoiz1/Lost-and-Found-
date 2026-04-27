# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Secrets Manager Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "db_connection_strings" {
  description = "Map of database connection strings (from RDS module)"
  type        = map(string)
  sensitive   = true
}

variable "db_names" {
  description = "List of database service names"
  type        = list(string)
  default     = ["auth", "item", "matching", "admin"]
}

variable "opensearch_master_password" {
  description = "OpenSearch master user password"
  type        = string
  sensitive   = true
}
