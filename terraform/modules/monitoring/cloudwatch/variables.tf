variable "project" { type = string }
variable "alarm_email" {
  type    = string
  default = ""
}
variable "lambda_function_names" {
  description = "List of Lambda function names to monitor"
  type        = list(string)
}
variable "api_gateway_id" {
  description = "API Gateway ID for 5xx alarm"
  type        = string
}
