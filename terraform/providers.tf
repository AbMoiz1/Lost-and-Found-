# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Terraform Providers
# ─────────────────────────────────────────────────────────────────────────────
# SA EXAM NOTE: The provider block tells Terraform which cloud to talk to
# and which region to create resources in. You can define multiple providers
# with aliases — we use "aws.dr" for the disaster recovery region.
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary region — where all main resources live
provider "aws" {
  region = var.primary_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# DR region — used for disaster recovery resources (cross-region replicas, DR VPC)
# SA EXAM NOTE: You reference this as "aws.dr" in resources that need to be
# in the DR region. Example: aws_db_instance_read_replica uses provider = aws.dr
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
