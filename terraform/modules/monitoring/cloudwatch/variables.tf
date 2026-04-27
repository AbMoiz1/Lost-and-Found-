variable "project" { type = string }
variable "ecs_cluster_name" { type = string }
variable "public_alb_arn_suffix" { type = string }

variable "alarm_email" {
  description = "Email to receive alarm notifications (leave empty to skip)"
  type        = string
  default     = ""
}
