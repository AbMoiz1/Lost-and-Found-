# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Serverless — Replaces provisioned Redis replication group
# ─────────────────────────────────────────────────────────────────────────────
# Requires a VPC with 3 subnets in different AZs.
# ─────────────────────────────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "redis" {
  cidr_block           = "10.98.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-redis-vpc" }
}

resource "aws_subnet" "redis" {
  count             = 3
  vpc_id            = aws_vpc.redis.id
  cidr_block        = cidrsubnet("10.98.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-redis-subnet-${count.index}" }
}

resource "aws_security_group" "redis" {
  name        = "${var.project}-redis-sg"
  description = "ElastiCache Serverless"
  vpc_id      = aws_vpc.redis.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-redis-sg" }
}

resource "aws_elasticache_serverless_cache" "main" {
  engine = "redis"
  name   = "${var.project}-redis"

  subnet_ids         = aws_subnet.redis[*].id
  security_group_ids = [aws_security_group.redis.id]

  cache_usage_limits {
    data_storage {
      maximum = 5
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 5000
    }
  }

  snapshot_retention_limit = 1

  tags = { Name = "${var.project}-redis" }
}
