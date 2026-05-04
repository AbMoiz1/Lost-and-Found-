output "dr_api_endpoint" {
  description = "DR API Gateway endpoint"
  value       = aws_apigatewayv2_api.dr.api_endpoint
}

output "dr_api_id" {
  description = "DR API Gateway ID"
  value       = aws_apigatewayv2_api.dr.id
}

output "dr_vpc_id" {
  description = "DR VPC ID"
  value       = aws_vpc.dr.id
}

output "dr_subnet_ids" {
  description = "List of DR subnet IDs"
  value       = aws_subnet.dr[*].id
}

output "dr_aurora_cluster_endpoint" {
  description = "DR Aurora cluster endpoint for read-only access"
  value       = aws_rds_cluster.dr.endpoint
}

output "dr_aurora_reader_endpoint" {
  description = "DR Aurora cluster reader endpoint"
  value       = aws_rds_cluster.dr.reader_endpoint
}

output "dr_lambda_auth_function_arn" {
  description = "ARN of DR Auth Lambda function"
  value       = aws_lambda_function.dr_auth.arn
}

output "dr_lambda_item_function_arn" {
  description = "ARN of DR Item Lambda function"
  value       = aws_lambda_function.dr_item.arn
}

output "dr_lambda_search_function_arn" {
  description = "ARN of DR Search Lambda function"
  value       = aws_lambda_function.dr_search.arn
}

output "dr_lambda_image_function_arn" {
  description = "ARN of DR Image Lambda function"
  value       = aws_lambda_function.dr_image.arn
}

output "dr_lambda_admin_function_arn" {
  description = "ARN of DR Admin Lambda function"
  value       = aws_lambda_function.dr_admin.arn
}

output "dr_lambda_execution_role_arn" {
  description = "ARN of DR Lambda execution role"
  value       = aws_iam_role.dr_lambda.arn
}

output "dr_lambda_security_group_id" {
  description = "Security group ID for DR Lambda functions"
  value       = aws_security_group.dr_lambda.id
}

output "dr_aurora_security_group_id" {
  description = "Security group ID for DR Aurora cluster"
  value       = aws_security_group.dr_aurora.id
}

output "dr_cloudwatch_log_group" {
  description = "CloudWatch log group for DR API Gateway"
  value       = aws_cloudwatch_log_group.dr_api.name
}

output "dr_health_alarm_name" {
  description = "CloudWatch alarm name for DR API health monitoring"
  value       = aws_cloudwatch_metric_alarm.dr_api_health.alarm_name
}
