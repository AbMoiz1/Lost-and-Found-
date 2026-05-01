# ─────────────────────────────────────────────────────────────────────────────
# Lost and Found — Serverless Root Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "state_bucket_name" {
  value = module.state.state_bucket_name
}

output "lock_table_name" {
  value = module.state.lock_table_name
}

output "aurora_endpoint" {
  value = module.aurora.cluster_endpoint
}

output "redis_endpoint" {
  value = module.elasticache.endpoint
}

output "opensearch_endpoint" {
  value = module.opensearch.collection_endpoint
}

output "items_topic_arn" {
  value = module.messaging.items_topic_arn
}

output "matches_topic_arn" {
  value = module.messaging.matches_topic_arn
}

output "images_bucket_name" {
  value = module.s3.images_bucket_name
}

output "frontend_bucket_name" {
  value = module.s3.frontend_bucket_name
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain (user-facing URL)"
  value       = module.cloudfront.distribution_domain_name
}

output "lambda_function_names" {
  value = module.lambda.lambda_function_names
}

output "pipeline_name" {
  value = module.cicd.pipeline_name
}

output "github_connection_status" {
  description = "Must be AVAILABLE — go to AWS Console > CodePipeline > Settings > Connections to approve"
  value       = module.cicd.github_connection_status
}

output "webhook_url" {
  description = "Add this as a GitHub webhook: Settings > Webhooks > Add webhook"
  value       = module.cicd.webhook_url
}
