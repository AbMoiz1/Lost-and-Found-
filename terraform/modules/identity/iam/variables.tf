# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — IAM Module Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project" {
  type = string
}

variable "all_secret_arns" {
  description = "All secret ARNs (for execution role)"
  type        = list(string)
}

variable "db_secret_arns" {
  description = "Map of DB secret ARNs per service"
  type        = map(string)
}

variable "jwt_secret_arn" {
  type = string
}

variable "opensearch_secret_arn" {
  type = string
}

variable "items_topic_arn" {
  type = string
}

variable "matches_topic_arn" {
  type = string
}

variable "search_items_queue_arn" {
  type = string
}

variable "matching_items_queue_arn" {
  type = string
}

variable "notification_matches_queue_arn" {
  type = string
}

variable "opensearch_domain_arn" {
  type = string
}

variable "images_bucket_arn" {
  type = string
}
