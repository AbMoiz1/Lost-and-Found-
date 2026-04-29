variable "project" {
  type = string
}

variable "lambda_invoke_arns" {
  description = "Map of service name to Lambda invoke ARN"
  type        = map(string)
}

variable "lambda_function_names" {
  description = "Map of service name to Lambda function name"
  type        = map(string)
}
