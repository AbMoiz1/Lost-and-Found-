# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ElastiCache Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Used by ECS module — Matching Service task definition needs REDIS_URL

output "primary_endpoint" {
  description = "Primary endpoint for Redis writes"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint for Redis reads (load-balanced across replicas)"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "replication_group_id" {
  description = "Replication group ID"
  value       = aws_elasticache_replication_group.main.id
}
