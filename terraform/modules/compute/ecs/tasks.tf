
locals {
  log_group_prefix = "/ecs/${var.project}"
}

# CloudWatch log groups for each service
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(["gateway", "auth", "item", "search", "image", "admin", "matching", "notification"])

  name              = "${local.log_group_prefix}/${each.key}"
  retention_in_days = 30

  tags = { Name = "${var.project}-${each.key}-logs" }
}

# ── GATEWAY TASK DEFINITION ──────────────────────────────────────────────────
resource "aws_ecs_task_definition" "gateway" {
  family             = "${var.project}-gateway"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["gateway"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "gateway"
    image     = "${var.ecr_urls["gateway"]}:v5"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 8080, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "INTERNAL_ALB_DNS", value = var.internal_alb_dns },
      { name = "FORCE_REDEPLOY", value = "v2" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["gateway"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-gateway-task" }
}

# ── AUTH TASK DEFINITION ─────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "auth" {
  family             = "${var.project}-auth"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["auth"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "auth"
    image     = "${var.ecr_urls["auth"]}:latest"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 4001, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "PORT", value = "4001" },
      { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" }
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.db_secret_arns["auth"] },
      { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["auth"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-auth-task" }
}

# ── ITEM TASK DEFINITION ────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "item" {
  family             = "${var.project}-item"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["item"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "item"
    image     = "${var.ecr_urls["item"]}:v2"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 4002, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "PORT", value = "4002" },
      { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" },
      { name = "SNS_ITEMS_TOPIC_ARN", value = var.items_topic_arn }
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.db_secret_arns["item"] },
      { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["item"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-item-task" }
}

# ── SEARCH TASK DEFINITION ──────────────────────────────────────────────────
resource "aws_ecs_task_definition" "search" {
  family             = "${var.project}-search"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["search"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "search"
    image     = "${var.ecr_urls["search"]}:v3"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 4003, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "PORT", value = "4003" },
      { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" },
      { name = "OPENSEARCH_URL", value = var.opensearch_endpoint },
      { name = "SQS_SEARCH_ITEMS_QUEUE_URL", value = var.search_items_queue_url }
    ]

    secrets = [
      { name = "OPENSEARCH_CREDENTIALS", valueFrom = var.opensearch_secret_arn }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["search"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-search-task" }
}

# ── IMAGE TASK DEFINITION ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "image_svc" {
  family             = "${var.project}-image"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["image"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "image"
    image     = "${var.ecr_urls["image"]}:latest"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 4004, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "PORT", value = "4004" },
      { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" },
      { name = "S3_BUCKET", value = var.images_bucket_name },
      { name = "AWS_REGION", value = var.region }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["image"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-image-task" }
}

# ── ADMIN TASK DEFINITION ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "admin" {
  family             = "${var.project}-admin"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["admin"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "admin"
    image     = "${var.ecr_urls["admin"]}:latest"
    cpu       = 128
    memory    = 256
    essential = true

    portMappings = [{ containerPort = 4005, hostPort = 0, protocol = "tcp" }]

    environment = [
      { name = "PORT", value = "4005" },
      { name = "NODE_TLS_REJECT_UNAUTHORIZED", value = "0" }
    ]

    secrets = [
      { name = "ADMIN_DATABASE_URL", valueFrom = var.db_secret_arns["admin"] },
      { name = "AUTH_DATABASE_URL", valueFrom = var.db_secret_arns["auth"] },
      { name = "ITEM_DATABASE_URL", valueFrom = var.db_secret_arns["item"] },
      { name = "MATCHING_DATABASE_URL", valueFrom = var.db_secret_arns["matching"] },
      { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["admin"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-admin-task" }
}

# ── MATCHING TASK DEFINITION ─────────────────────────────────────────────────
resource "aws_ecs_task_definition" "matching" {
  family             = "${var.project}-matching"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["matching"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "matching"
    image     = "${var.ecr_urls["matching"]}:v2"
    cpu       = 256
    memory    = 512
    essential = true

    environment = [
      { name = "SQS_MATCHING_ITEMS_QUEUE_URL", value = var.matching_items_queue_url },
      { name = "SNS_MATCHES_TOPIC_ARN", value = var.matches_topic_arn },
      { name = "REDIS_URL", value = "rediss://${var.redis_endpoint}:6379" },
      { name = "MATCH_THRESHOLD", value = "0.5" }
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = var.db_secret_arns["matching"] },
      { name = "ITEM_DATABASE_URL", valueFrom = var.db_secret_arns["item"] }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["matching"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-matching-task" }
}

# ── NOTIFICATION TASK DEFINITION ─────────────────────────────────────────────
resource "aws_ecs_task_definition" "notification" {
  family             = "${var.project}-notification"
  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arns["notification"]
  network_mode       = "bridge"

  container_definitions = jsonencode([{
    name      = "notification"
    image     = "${var.ecr_urls["notification"]}:v2"
    cpu       = 128
    memory    = 256
    essential = true

    environment = [
      { name = "SQS_NOTIFICATION_MATCHES_QUEUE_URL", value = var.notification_matches_queue_url },
      { name = "AUTH_SERVICE_URL", value = "http://${var.internal_alb_dns}:80" },
      { name = "AWS_REGION", value = var.region },
      { name = "FROM_EMAIL", value = "abdulmoiztahir21@gmail.com" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services["notification"].name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = { Name = "${var.project}-notification-task" }
}
