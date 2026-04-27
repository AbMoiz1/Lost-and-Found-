# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — OpenSearch Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: opensearchproject/opensearch:2.13.0 container running with
# DISABLE_SECURITY_PLUGIN=true and discovery.type=single-node.
# Locally: completely open, no auth, no encryption, single node.
#
# SA EXAM NOTE:
#   - VPC access vs Public access: VPC = no public endpoint, only reachable
#     from within VPC. More secure. Public = anyone with URL can try.
#   - Zone awareness: distributes data nodes across AZs for HA.
#   - Dedicated master nodes: manage cluster state (not data). For production
#     use 3 dedicated masters across 3 AZs. We skip for dev.
#   - Domain access policy: controls WHO can call the OpenSearch API.
#     With VPC access, we restrict to the ECS security group.
# ─────────────────────────────────────────────────────────────────────────────

# Get current AWS account ID and region for the access policy
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

resource "aws_opensearch_domain" "main" {
  domain_name    = "${var.project}-search"
  engine_version = "OpenSearch_2.13"

  # Cluster config — 2 data nodes across 2 AZs
  cluster_config {
    instance_type          = var.instance_type
    instance_count         = 2
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  # EBS storage — 10GB gp3 per node
  ebs_options {
    ebs_enabled = true
    volume_size = 10
    volume_type = "gp3"
  }

  # VPC access — domain only reachable from within VPC
  # SA EXAM NOTE: This means NO public endpoint. The domain gets a
  # VPC endpoint (ENI) in your private subnets. Only resources in the
  # VPC with the right security group can reach it.
  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, 2) # 2 subnets for 2 AZ nodes
    security_group_ids = [var.opensearch_sg_id]
  }

  # Encryption at rest — data on disk encrypted with AWS KMS
  encrypt_at_rest {
    enabled = true
  }

  # Node-to-node encryption — data between nodes encrypted with TLS
  node_to_node_encryption {
    enabled = true
  }

  # Enforce HTTPS on all connections
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # Advanced security — fine-grained access control
  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = "admin"
      master_user_password = var.master_password
    }
  }

  tags = {
    Name = "${var.project}-search"
  }
}

# Domain access policy — allow access from within VPC
resource "aws_opensearch_domain_policy" "main" {
  domain_name = aws_opensearch_domain.main.domain_name

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action    = "es:*"
        Resource  = "${aws_opensearch_domain.main.arn}/*"
      }
    ]
  })
}
