# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Secrets Manager Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Used by:
#   - ECS module (task definitions reference secret ARNs via valueFrom)
#   - IAM module (per-service roles get access to specific secret ARNs only)
# ─────────────────────────────────────────────────────────────────────────────

output "db_secret_arns" {
  description = "Map of database secret ARNs (service_name → secret ARN)"
  value = {
    for key, secret in aws_secretsmanager_secret.db_credentials :
    key => secret.arn
  }
}

output "jwt_secret_arn" {
  description = "ARN of the JWT signing secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "opensearch_secret_arn" {
  description = "ARN of the OpenSearch credentials secret"
  value       = aws_secretsmanager_secret.opensearch_credentials.arn
}

output "all_secret_arns" {
  description = "List of all secret ARNs (for ECS execution role)"
  value = concat(
    [for secret in aws_secretsmanager_secret.db_credentials : secret.arn],
    [aws_secretsmanager_secret.jwt_secret.arn],
    [aws_secretsmanager_secret.opensearch_credentials.arn]
  )
}
