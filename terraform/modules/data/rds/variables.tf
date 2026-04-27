# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — RDS Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Project name used in resource naming"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security group ID for RDS instances"
  type        = string
}

variable "instance_class" {
  description = "RDS instance type (db.t3.micro for dev, db.r6g.large for prod)"
  type        = string
  default     = "db.t3.micro"
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups (0-35)"
  type        = number
  default     = 7
}
