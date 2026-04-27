# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ElastiCache Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the Redis subnet group"
  type        = list(string)
}

variable "redis_sg_id" {
  description = "Security group ID for ElastiCache Redis"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type (cache.t3.micro for dev)"
  type        = string
  default     = "cache.t3.micro"
}
