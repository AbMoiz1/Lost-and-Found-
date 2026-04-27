resource "aws_security_group" "public_alb" {
  name        = "${var.project}-sg-public-alb"
  description = "Allow HTTPS from internet to Public ALB"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-public-alb" }
}

resource "aws_security_group" "internal_alb" {
  name        = "${var.project}-sg-internal-alb"
  description = "Allow traffic from ECS to Internal ALB"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-internal-alb" }
}

resource "aws_security_group" "ecs" {
  name        = "${var.project}-sg-ecs"
  description = "ECS containers"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-ecs" }
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-sg-rds"
  description = "RDS PostgreSQL"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-rds" }
}

resource "aws_security_group" "redis" {
  name        = "${var.project}-sg-redis"
  description = "ElastiCache Redis"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-redis" }
}

resource "aws_security_group" "opensearch" {
  name        = "${var.project}-sg-opensearch"
  description = "OpenSearch"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-sg-opensearch" }
}
