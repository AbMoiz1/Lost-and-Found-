# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — IAM Roles Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: The .env file. Locally every container gets the same
# environment variables — no access control. Auth Service can read Item
# Service's database password. IAM replaces this with per-service roles.
#
# SA EXAM NOTE:
#   - Execution Role: used by ECS AGENT to pull images, write logs, read secrets
#   - Task Role: used by YOUR CODE to access AWS services (S3, SQS, SNS, etc.)
#   - Least privilege: each service gets ONLY the permissions it needs
#   - Trust policy: defines WHO can assume the role (ecs-tasks.amazonaws.com)
# ─────────────────────────────────────────────────────────────────────────────

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ── ECS EXECUTION ROLE (shared by all services) ─────────────────────────────
# This is what the ECS agent uses to set up containers — NOT your app code.

resource "aws_iam_role" "ecs_execution" {
  name = "${var.project}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-ecs-execution-role" }
}

# Attach AWS managed policy for basic ECS execution
resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional: read secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.project}-execution-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = var.all_secret_arns
    }]
  })
}

# ── TASK ROLES (one per service) ─────────────────────────────────────────────
# Each service gets its own role with ONLY the permissions it needs.

# Trust policy shared by all task roles
data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ── GATEWAY (no AWS permissions needed — just routes traffic) ────────────────
resource "aws_iam_role" "gateway" {
  name               = "${var.project}-gateway-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-gateway-task-role" }
}

# ── AUTH SERVICE ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "auth" {
  name               = "${var.project}-auth-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-auth-task-role" }
}

resource "aws_iam_role_policy" "auth" {
  name = "${var.project}-auth-policy"
  role = aws_iam_role.auth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.db_secret_arns["auth"], var.jwt_secret_arn]
    }]
  })
}

# ── ITEM SERVICE ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "item" {
  name               = "${var.project}-item-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-item-task-role" }
}

resource "aws_iam_role_policy" "item" {
  name = "${var.project}-item-policy"
  role = aws_iam_role.item.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.db_secret_arns["item"], var.jwt_secret_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.items_topic_arn]
      }
    ]
  })
}

# ── SEARCH SERVICE ───────────────────────────────────────────────────────────
resource "aws_iam_role" "search" {
  name               = "${var.project}-search-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-search-task-role" }
}

resource "aws_iam_role_policy" "search" {
  name = "${var.project}-search-policy"
  role = aws_iam_role.search.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [var.search_items_queue_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["es:ESHttp*"]
        Resource = ["${var.opensearch_domain_arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.opensearch_secret_arn]
      }
    ]
  })
}

# ── IMAGE SERVICE ────────────────────────────────────────────────────────────
resource "aws_iam_role" "image" {
  name               = "${var.project}-image-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-image-task-role" }
}

resource "aws_iam_role_policy" "image" {
  name = "${var.project}-image-policy"
  role = aws_iam_role.image.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      Resource = ["${var.images_bucket_arn}/*"]
    }]
  })
}

# ── ADMIN SERVICE ────────────────────────────────────────────────────────────
resource "aws_iam_role" "admin" {
  name               = "${var.project}-admin-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-admin-task-role" }
}

resource "aws_iam_role_policy" "admin" {
  name = "${var.project}-admin-policy"
  role = aws_iam_role.admin.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        var.db_secret_arns["admin"],
        var.db_secret_arns["auth"],
        var.db_secret_arns["item"],
        var.db_secret_arns["matching"],
        var.jwt_secret_arn
      ]
    }]
  })
}

# ── MATCHING SERVICE ─────────────────────────────────────────────────────────
resource "aws_iam_role" "matching" {
  name               = "${var.project}-matching-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-matching-task-role" }
}

resource "aws_iam_role_policy" "matching" {
  name = "${var.project}-matching-policy"
  role = aws_iam_role.matching.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [var.db_secret_arns["matching"], var.db_secret_arns["item"]]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [var.matching_items_queue_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.matches_topic_arn]
      }
    ]
  })
}

# ── NOTIFICATION SERVICE ─────────────────────────────────────────────────────
resource "aws_iam_role" "notification" {
  name               = "${var.project}-notification-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = { Name = "${var.project}-notification-task-role" }
}

resource "aws_iam_role_policy" "notification" {
  name = "${var.project}-notification-policy"
  role = aws_iam_role.notification.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [var.notification_matches_queue_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = ["*"]
      }
    ]
  })
}
