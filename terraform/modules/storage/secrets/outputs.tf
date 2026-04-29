output "aurora_secret_arn" {
  value = aws_secretsmanager_secret.aurora_credentials.arn
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt_secret.arn
}

output "opensearch_secret_arn" {
  value = aws_secretsmanager_secret.opensearch_credentials.arn
}

output "all_secret_arns" {
  value = [
    aws_secretsmanager_secret.aurora_credentials.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.opensearch_credentials.arn
  ]
}

output "jwt_secret_value" {
  value     = random_password.jwt_secret.result
  sensitive = true
}
