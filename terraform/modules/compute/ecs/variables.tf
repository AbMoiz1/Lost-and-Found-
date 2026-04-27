variable "project" { type = string }
variable "region" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "ecs_sg_id" { type = string }
variable "execution_role_arn" { type = string }
variable "task_role_arns" { type = map(string) }
variable "ecr_urls" { type = map(string) }
variable "db_secret_arns" { type = map(string) }
variable "jwt_secret_arn" { type = string }
variable "opensearch_secret_arn" { type = string }
variable "opensearch_endpoint" { type = string }
variable "redis_endpoint" { type = string }
variable "items_topic_arn" { type = string }
variable "matches_topic_arn" { type = string }
variable "search_items_queue_url" { type = string }
variable "matching_items_queue_url" { type = string }
variable "notification_matches_queue_url" { type = string }
variable "images_bucket_name" { type = string }
variable "internal_alb_dns" {
  type    = string
  default = "internal-alb" # placeholder until ALB module is built
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "asg_min" {
  type    = number
  default = 1
}

variable "asg_max" {
  type    = number
  default = 3
}

variable "asg_desired" {
  type    = number
  default = 2
}

# Target group ARNs for ALB registration
variable "gateway_target_group_arn" { type = string }
variable "auth_target_group_arn" { type = string }
variable "item_target_group_arn" { type = string }
variable "search_target_group_arn" { type = string }
variable "image_target_group_arn" { type = string }
variable "admin_target_group_arn" { type = string }
