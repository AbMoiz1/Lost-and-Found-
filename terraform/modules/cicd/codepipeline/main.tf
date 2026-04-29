# ─────────────────────────────────────────────────────────────────────────────
# CI/CD Pipeline — CodePipeline + CodeBuild
# ─────────────────────────────────────────────────────────────────────────────
# GitHub (source) → CodePipeline (orchestrator) → CodeBuild (build + deploy)
# ─────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── S3 Artifact Bucket ──────────────────────────────────────────────────────

resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project}-pipeline-artifacts"
  force_destroy = true
  tags          = { Name = "${var.project}-pipeline-artifacts" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# ── GitHub Connection (CodeStar) ─────────────────────────────────────────────

resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project}-github"
  provider_type = "GitHub"
  tags          = { Name = "${var.project}-github-connection" }
}

# ── CodeBuild IAM Role ───────────────────────────────────────────────────────

resource "aws_iam_role" "codebuild" {
  name = "${var.project}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-codebuild-role" }
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.project}-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*",
          "arn:aws:s3:::${var.project}-frontend-*",
          "arn:aws:s3:::${var.project}-frontend-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction"
        ]
        Resource = "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${var.project}-*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation", "cloudfront:ListDistributions"]
        Resource = "*"
      }
    ]
  })
}