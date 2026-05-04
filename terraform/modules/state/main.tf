
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project}-terraform-state"

  # Prevent accidental deletion — this bucket holds your entire infrastructure map
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "${var.project}-terraform-state"
  }
}

# Enable versioning — every time state is updated, S3 keeps the old version
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt state at rest — state contains sensitive info like database endpoints
# SA EXAM NOTE: SSE-S3 (AES-256) is free and automatic. SSE-KMS gives you
# control over the key (audit who accessed it, rotate it) but costs more.
# For a state file, SSE-S3 is sufficient.
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — state file should NEVER be public
# SA EXAM NOTE: This is a common exam question. S3 buckets are private by
# default, but these settings add extra protection against accidental
# policy changes that could expose the bucket.
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DYNAMODB TABLE — state locking
# SA EXAM NOTE: When you run "terraform apply", Terraform writes a lock entry
# to this table with a unique ID. If someone else tries to run "terraform apply"
# at the same time, DynamoDB's conditional write fails → they get a
# "state locked" error. This prevents concurrent modifications.
#
# The table only needs one attribute: LockID (string, partition key).
# Terraform manages the rest automatically.
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST" # No need to provision capacity for a lock table

  hash_key = "LockID"

  attribute {
    name = "LockID"
    type = "S" # String
  }

  tags = {
    Name = "${var.project}-terraform-locks"
  }
}
