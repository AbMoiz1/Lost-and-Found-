# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — S3 Buckets Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT:
#   Images: LocalStack S3 on port 4566, bucket "lost-and-found-images",
#           test credentials, forcePathStyle: true
#   Frontend: Nginx container serves React build from disk on port 3000
#
# SA EXAM NOTE:
#   - S3 durability: 99.999999999% (11 nines) — data replicated across 3+ AZs
#   - S3 availability: 99.99% for Standard class
#   - SSE-S3 (AES-256) is free. SSE-KMS gives key control but costs more.
#   - Static website hosting: S3 serves index.html for any path (SPA routing)
#   - OAI (Origin Access Identity): CloudFront identity that S3 trusts.
#     Users can't bypass CloudFront and hit S3 directly.
#   - Public access block: 4 settings that prevent accidental public exposure
# ─────────────────────────────────────────────────────────────────────────────

# ── IMAGES BUCKET ────────────────────────────────────────────────────────────
# Replaces LocalStack S3 bucket "lost-and-found-images"
# Image Service uploads original + thumbnail here

resource "aws_s3_bucket" "images" {
  bucket = "${var.project}-images-${var.environment}"

  tags = {
    Name = "${var.project}-images-${var.environment}"
  }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── FRONTEND BUCKET ──────────────────────────────────────────────────────────
# Replaces the frontend Nginx container that serves React build files.
# CloudFront will serve from this bucket. Users never hit S3 directly.

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project}-frontend-${var.environment}"

  tags = {
    Name = "${var.project}-frontend-${var.environment}"
  }
}

# Static website hosting — serves index.html for all routes
# SA EXAM NOTE: error_document = index.html is critical for SPAs.
# When a user navigates to /search, S3 doesn't have a /search file.
# Without this, S3 returns 404. With error_document = index.html,
# S3 serves index.html and React Router handles the route client-side.
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── CLOUDFRONT ORIGIN ACCESS IDENTITY ────────────────────────────────────────
# SA EXAM NOTE: OAI is a special CloudFront identity. The frontend bucket
# policy allows ONLY this OAI to read objects. Users can't bypass CloudFront
# and access S3 directly. This ensures all traffic goes through CloudFront
# (where you get caching, HTTPS, and DDoS protection).

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "OAI for ${var.project} frontend bucket"
}

# Bucket policy — only CloudFront OAI can read frontend files
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAI"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}
