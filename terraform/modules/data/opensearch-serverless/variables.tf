variable "project" {
  type = string
}

variable "lambda_role_arn" {
  description = "Lambda execution role ARN for data access policy"
  type        = string
}
