# ─────────────────────────────────────────────────────────────────────────────
# Aurora Serverless v2 — Replaces 4 separate RDS PostgreSQL instances
# ─────────────────────────────────────────────────────────────────────────────
# Aurora requires a VPC with subnets. We create a minimal private VPC
# just for the database — no NAT, no IGW, no public access.
# ─────────────────────────────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "aurora" {
  cidr_block           = "10.99.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-aurora-vpc" }
}

resource "aws_subnet" "aurora" {
  count             = 2
  vpc_id            = aws_vpc.aurora.id
  cidr_block        = cidrsubnet("10.99.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-aurora-subnet-${count.index}" }
}

resource "aws_db_subnet_group" "aurora" {
  name       = "${var.project}-aurora-subnet-group"
  subnet_ids = aws_subnet.aurora[*].id
  tags       = { Name = "${var.project}-aurora-subnet-group" }
}

resource "aws_security_group" "aurora" {
  name        = "${var.project}-aurora-sg"
  description = "Aurora Serverless v2"
  vpc_id      = aws_vpc.aurora.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "PostgreSQL access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-aurora-sg" }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.project}-aurora-cluster"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "16.4"
  database_name      = "auth_db"
  master_username    = "dbadmin"
  master_password    = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }

  storage_encrypted       = true
  deletion_protection     = false
  skip_final_snapshot     = true
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"

  tags = { Name = "${var.project}-aurora-cluster" }
}

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project}-aurora-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  tags               = { Name = "${var.project}-aurora-writer" }
}

resource "aws_rds_cluster_instance" "reader" {
  identifier         = "${var.project}-aurora-reader"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version
  tags               = { Name = "${var.project}-aurora-reader" }
}
