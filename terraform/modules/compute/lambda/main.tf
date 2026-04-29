# ─────────────────────────────────────────────────────────────────────────────
# Lambda Functions — Replaces ECS on EC2 (8 containers → 8 Lambda functions)
# ─────────────────────────────────────────────────────────────────────────────
# 5 HTTP functions (behind API Gateway): auth, item, search, image, admin
# 3 event-driven workers (triggered by SQS): search-indexer, matching, notification
# ─────────────────────────────────────────────────────────────────────────────

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Placeholder zip for initial deployment — replaced by CI/CD pipeline
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'placeholder' });"
    filename = "index.js"
  }
}

# ── Shared IAM execution role for all Lambda functions ───────────────────────

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project}-lambda-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-lambda-execution" }
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_permissions" {
  name = "${var.project}-lambda-permissions"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.all_secret_arns
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.items_topic_arn, var.matches_topic_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [var.search_queue_arn, var.matching_queue_arn, var.notification_queue_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = ["${var.images_bucket_arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = ["*"]
      },
      {
        Effect   = "Allow"
        Action   = ["aoss:APIAccessAll"]
        Resource = [var.opensearch_collection_arn]
      }
    ]
  })
}