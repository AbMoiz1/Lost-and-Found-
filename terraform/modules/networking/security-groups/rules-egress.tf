# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ECS Egress + Data Tier Ingress Rules
# ─────────────────────────────────────────────────────────────────────────────

# ECS → Internal ALB (Nginx Gateway forwards to Internal ALB)
resource "aws_vpc_security_group_egress_rule" "ecs_to_internal_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "To Internal ALB (service-to-service)"
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.internal_alb.id
}

# ECS → RDS PostgreSQL
resource "aws_vpc_security_group_egress_rule" "ecs_to_rds" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "To RDS PostgreSQL"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.rds.id
}

# ECS → ElastiCache Redis
resource "aws_vpc_security_group_egress_rule" "ecs_to_redis" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "To ElastiCache Redis"
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.redis.id
}

# ECS → OpenSearch
resource "aws_vpc_security_group_egress_rule" "ecs_to_opensearch" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "To OpenSearch"
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.opensearch.id
}

# ECS → Internet HTTPS (AWS services via NAT: SES, ECR, SQS, SNS, Secrets Manager)
resource "aws_vpc_security_group_egress_rule" "ecs_to_internet_https" {
  security_group_id = aws_security_group.ecs.id
  description       = "HTTPS to internet (AWS services via NAT)"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

# ── DATA TIER INGRESS (from ECS only) ───────────────────────────────────────

# RDS ← ECS
resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from ECS containers"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}

# Redis ← ECS
resource "aws_vpc_security_group_ingress_rule" "redis_from_ecs" {
  security_group_id            = aws_security_group.redis.id
  description                  = "Redis from ECS containers"
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}

# OpenSearch ← ECS
resource "aws_vpc_security_group_ingress_rule" "opensearch_from_ecs" {
  security_group_id            = aws_security_group.opensearch.id
  description                  = "OpenSearch from ECS containers"
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}
