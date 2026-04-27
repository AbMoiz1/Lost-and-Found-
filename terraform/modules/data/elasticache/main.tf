# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ElastiCache Redis Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: redis:7-alpine container in docker-compose.
# Locally: single container, no replication, no encryption, no persistence.
# If it dies, Matching Service just re-scores pairs (cache miss).
#
# SA EXAM NOTE:
#   - Replication Group = 1 primary + N replicas. Primary handles writes,
#     replicas handle reads.
#   - Multi-AZ automatic failover: if primary dies, a replica promotes
#     to primary automatically (~30 seconds). Same pattern as RDS Multi-AZ.
#   - Cluster Mode Disabled (what we use): one shard, all data fits in one
#     node. Simple. Good for caching.
#   - Cluster Mode Enabled: multiple shards, data partitioned across nodes.
#     For large datasets that don't fit in one node's memory.
#   - Encryption at rest = KMS. Encryption in transit = TLS.
# ─────────────────────────────────────────────────────────────────────────────

# Subnet group — tells ElastiCache which subnets to place nodes in
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project}-redis-subnet-group"
  }
}

# Redis replication group — 1 primary + 1 replica, Multi-AZ
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-redis"
  description          = "Redis cache for Matching Service scored pairs"

  # Engine — Redis 7.x matching local redis:7-alpine
  engine         = "redis"
  engine_version = "7.1"

  # Instance size — cache.t3.micro for dev (~$13/month per node)
  node_type = var.node_type

  # 1 primary + 1 replica = 2 nodes total
  # SA EXAM NOTE: num_cache_clusters is the TOTAL count (primary + replicas)
  num_cache_clusters = 2

  # Multi-AZ automatic failover
  # If primary in AZ-1 dies → replica in AZ-2 promotes to primary
  # SA EXAM NOTE: Requires at least 2 nodes. Without this, a node
  # failure means manual intervention to restore the cache.
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Networking — private subnets, locked to ECS security group
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_sg_id]

  # Port — same as local Redis
  port = 6379

  # Encryption at rest — data on disk encrypted with AWS KMS
  # Locally: Redis stores everything in plaintext
  at_rest_encryption_enabled = true

  # Encryption in transit — TLS between app and Redis
  # SA EXAM NOTE: Adds ~10% latency but required for compliance.
  # Your app must connect using rediss:// (with double s) instead of redis://
  transit_encryption_enabled = true

  # Maintenance window — when AWS applies patches
  maintenance_window = "Mon:05:00-Mon:06:00"

  # Snapshot (backup) — daily snapshot retained for 1 day
  snapshot_retention_limit = 1
  snapshot_window          = "03:00-04:00"

  # Apply changes immediately in dev
  apply_immediately = true

  tags = {
    Name = "${var.project}-redis"
  }
}
