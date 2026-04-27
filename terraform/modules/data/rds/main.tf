# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — RDS PostgreSQL Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: Four postgres:16-alpine containers in docker-compose:
#   postgres-auth:5432     → auth_db
#   postgres-item:5432     → item_db
#   postgres-matching:5432 → matching_db
#   postgres-admin:5432    → admin_db
#
# Locally: single container, no replication, no encryption, no backups.
# If the container dies, in-flight transactions are lost.
#
# SA EXAM NOTE:
#   - Multi-AZ = synchronous standby in another AZ for HA (auto-failover ~60s)
#   - Multi-AZ standby CANNOT serve reads (it's just a hot backup)
#   - Read Replica = async copy that CAN serve reads (for scaling, not HA)
#   - DB Subnet Group = tells RDS which subnets to use (must span 2+ AZs)
#   - gp3 storage = 3000 IOPS baseline free, decoupled from storage size
#   - Encryption at rest must be enabled at creation (can't encrypt later)
# ─────────────────────────────────────────────────────────────────────────────

# DB Subnet Group — tells RDS to place instances in our private subnets
# Must span at least 2 AZs (we use all 3 for maximum availability)
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project}-db-subnet-group"
  }
}

# ── DATABASE DEFINITIONS ─────────────────────────────────────────────────────
# We create 4 separate RDS instances — one per service database.
# This matches the microservices pattern: each service owns its data.
#
# SA EXAM NOTE: Why separate instances instead of one instance with 4 databases?
#   - Independent scaling (auth_db might need more IOPS than admin_db)
#   - Independent failover (if item_db fails, auth_db keeps running)
#   - True isolation (a runaway query in matching_db can't starve auth_db)
#   - Matches least-privilege IAM (each service role accesses only its DB)

locals {
  databases = {
    auth = {
      name     = "auth_db"
      username = "auth_user"
    }
    item = {
      name     = "item_db"
      username = "item_user"
    }
    matching = {
      name     = "matching_db"
      username = "match_user"
    }
    admin = {
      name     = "admin_db"
      username = "admin_user"
    }
  }
}

# Generate a random password for each database
# SA EXAM NOTE: In production, these would be stored in Secrets Manager
# with automatic rotation. For now we generate them and output them.
resource "random_password" "db_passwords" {
  for_each = local.databases

  length  = 24
  special = false # RDS doesn't allow some special chars in passwords
}

# Create an RDS instance for each database
resource "aws_db_instance" "databases" {
  for_each = local.databases

  identifier = "${var.project}-${each.key}-db"

  # Engine — same PostgreSQL 16 as local containers
  engine         = "postgres"
  engine_version = "16"

  # Instance size — db.t3.micro for dev (~$15/month each)
  # SA EXAM NOTE: T-class = burstable (good for variable workloads)
  # R-class = memory-optimized (good for large datasets)
  # M-class = general purpose
  instance_class = var.instance_class

  # Storage — 20GB gp3 (minimum)
  # SA EXAM NOTE: gp3 gives 3000 IOPS and 125 MB/s baseline for free
  # gp2 ties IOPS to storage size (3 IOPS per GB)
  # gp3 is newer and better — always pick gp3 on the exam
  allocated_storage = 20
  storage_type      = "gp3"

  # Database name and credentials
  db_name  = each.value.name
  username = each.value.username
  password = random_password.db_passwords[each.key].result

  # Multi-AZ — synchronous standby in another AZ
  # SA EXAM NOTE: This creates a hidden standby replica. If the primary
  # AZ has an outage, RDS automatically promotes the standby (~60s).
  # Your app uses the same endpoint — DNS flips to the new primary.
  # The standby CANNOT serve read traffic (unlike a Read Replica).
  multi_az = var.multi_az

  # Networking — private subnets only, locked to ECS security group
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  # No public access — database is only reachable from within the VPC
  publicly_accessible = false

  # Backups — automatic daily snapshots
  # SA EXAM NOTE: backup_retention_period = 0 disables backups.
  # Max is 35 days. Point-in-time recovery lets you restore to any
  # second within the retention window.
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00" # UTC, during off-peak

  # Maintenance window — when AWS applies patches
  maintenance_window = "Mon:04:00-Mon:05:00"

  # Encryption at rest using AWS-managed KMS key
  # SA EXAM NOTE: Must be enabled at creation. You CANNOT encrypt
  # an existing unencrypted database. You'd have to snapshot it,
  # copy the snapshot with encryption, then restore from the copy.
  storage_encrypted = true

  # Performance Insights — free tier gives 7 days of data
  # Helps identify slow queries and bottlenecks
  performance_insights_enabled = true

  # Dev settings — skip snapshot on delete, allow destroy
  skip_final_snapshot = true
  deletion_protection = false

  # Apply changes immediately in dev (production: false = next maintenance window)
  apply_immediately = true

  tags = {
    Name    = "${var.project}-${each.key}-db"
    Service = each.key
  }
}
