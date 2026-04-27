# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ECR Module Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "repository_urls" {
  description = "Map of ECR repository URLs per service"
  value = {
    for key, repo in aws_ecr_repository.services :
    key => repo.repository_url
  }
}

output "repository_arns" {
  description = "Map of ECR repository ARNs per service"
  value = {
    for key, repo in aws_ecr_repository.services :
    key => repo.arn
  }
}
