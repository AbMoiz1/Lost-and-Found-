# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — OpenSearch Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Used by ECS module — Search Service task definition needs OPENSEARCH_URL

output "domain_endpoint" {
  description = "OpenSearch domain endpoint (HTTPS)"
  value       = "https://${aws_opensearch_domain.main.endpoint}"
}

output "domain_arn" {
  description = "OpenSearch domain ARN (for IAM policies)"
  value       = aws_opensearch_domain.main.arn
}

output "domain_id" {
  description = "OpenSearch domain ID"
  value       = aws_opensearch_domain.main.domain_id
}
