# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Security Groups Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Every module that creates a resource needing network access will reference
# one of these security group IDs.
# ─────────────────────────────────────────────────────────────────────────────

output "public_alb_sg_id" {
  description = "Security group ID for the Public ALB"
  value       = aws_security_group.public_alb.id
}

output "internal_alb_sg_id" {
  description = "Security group ID for the Internal ALB"
  value       = aws_security_group.internal_alb.id
}

output "ecs_sg_id" {
  description = "Security group ID for ECS containers"
  value       = aws_security_group.ecs.id
}

output "rds_sg_id" {
  description = "Security group ID for RDS PostgreSQL"
  value       = aws_security_group.rds.id
}

output "redis_sg_id" {
  description = "Security group ID for ElastiCache Redis"
  value       = aws_security_group.redis.id
}

output "opensearch_sg_id" {
  description = "Security group ID for OpenSearch"
  value       = aws_security_group.opensearch.id
}
