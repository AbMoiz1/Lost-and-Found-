variable "project" { type = string }
variable "all_secret_arns" { type = list(string) }
variable "aurora_endpoint" { type = string }
variable "aurora_secret_arn" { type = string }
variable "jwt_secret_arn" { type = string }
variable "items_topic_arn" { type = string }
variable "matches_topic_arn" { type = string }
variable "search_queue_arn" { type = string }
variable "matching_queue_arn" { type = string }
variable "notification_queue_arn" { type = string }
variable "images_bucket_arn" { type = string }
variable "images_bucket_name" { type = string }
variable "opensearch_endpoint" { type = string }
variable "opensearch_collection_arn" { type = string }
variable "redis_endpoint" { type = string }
variable "db_username" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "jwt_secret" {
  type      = string
  sensitive = true
}
variable "aurora_vpc_id" { type = string }
variable "aurora_subnet_ids" { type = list(string) }
variable "aurora_security_group_id" { type = string }
