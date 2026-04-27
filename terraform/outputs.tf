# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Root Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Aggregated outputs from all modules. Run "terraform output" to see these.
# ─────────────────────────────────────────────────────────────────────────────

# ── Module 1: State ──────────────────────────────────────────────────────────
output "state_bucket_name" {
  description = "S3 bucket storing Terraform state"
  value       = module.state.state_bucket_name
}

output "lock_table_name" {
  description = "DynamoDB table for state locking"
  value       = module.state.lock_table_name
}

# ── Module 2: VPC ───────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# ── Module 3: Security Groups ──────────────────────────────────────────────
output "ecs_sg_id" {
  description = "ECS security group ID"
  value       = module.security_groups.ecs_sg_id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = module.security_groups.rds_sg_id
}

# ── Module 4: RDS PostgreSQL ───────────────────────────────────────────────
output "db_endpoints" {
  description = "RDS database endpoints"
  value       = module.rds.db_endpoints
}

# ── Module 5: ElastiCache Redis ────────────────────────────────────────────
output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
}

# ── Module 6: OpenSearch ───────────────────────────────────────────────────
output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = module.opensearch.domain_endpoint
}

# ── Module 7: SNS + SQS Messaging ─────────────────────────────────────────
output "items_topic_arn" {
  description = "SNS items topic ARN"
  value       = module.messaging.items_topic_arn
}

output "matches_topic_arn" {
  description = "SNS matches topic ARN"
  value       = module.messaging.matches_topic_arn
}

# ── Module 8: S3 Buckets ──────────────────────────────────────────────────
output "images_bucket_name" {
  description = "Images S3 bucket name"
  value       = module.s3.images_bucket_name
}

output "frontend_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = module.s3.frontend_bucket_name
}

# ── Module 9: Secrets Manager ─────────────────────────────────────────────
output "jwt_secret_arn" {
  description = "JWT secret ARN in Secrets Manager"
  value       = module.secrets.jwt_secret_arn
}

# ── Module 10: IAM Roles ──────────────────────────────────────────────────
output "execution_role_arn" {
  description = "ECS execution role ARN"
  value       = module.iam.execution_role_arn
}

# ── Module 11: ECR ────────────────────────────────────────────────────────
output "ecr_repository_urls" {
  description = "ECR repository URLs per service"
  value       = module.ecr.repository_urls
}

# ── Module 12: ECS ────────────────────────────────────────────────────────
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

# ── Module 13: ALB ────────────────────────────────────────────────────────
output "public_alb_dns" {
  description = "Public ALB DNS (internet entry point)"
  value       = module.alb.public_alb_dns
}

output "internal_alb_dns" {
  description = "Internal ALB DNS (service-to-service)"
  value       = module.alb.internal_alb_dns
}

# ── Module 14: CloudFront ─────────────────────────────────────────────────
output "cloudfront_domain" {
  description = "CloudFront distribution domain (user-facing URL)"
  value       = module.cloudfront.distribution_domain_name
}

# ── Module 15: WAF ────────────────────────────────────────────────────────
output "waf_acl_id" {
  description = "WAF Web ACL ID"
  value       = module.waf.web_acl_id
}
