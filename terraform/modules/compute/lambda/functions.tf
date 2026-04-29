# ─────────────────────────────────────────────────────────────────────────────
# HTTP Lambda Functions (behind API Gateway)
# ─────────────────────────────────────────────────────────────────────────────

locals {
  common_env = {
    AURORA_ENDPOINT     = var.aurora_endpoint
    AURORA_SECRET_ARN   = var.aurora_secret_arn
    JWT_SECRET_ARN      = var.jwt_secret_arn
    ITEMS_TOPIC_ARN     = var.items_topic_arn
    MATCHES_TOPIC_ARN   = var.matches_topic_arn
    IMAGES_BUCKET       = var.images_bucket_name
    OPENSEARCH_ENDPOINT = var.opensearch_endpoint
    REDIS_ENDPOINT      = var.redis_endpoint
    DATABASE_URL        = "postgresql://${var.db_username}:${var.db_password}@${var.aurora_endpoint}:5432/auth_db"
    ITEM_DATABASE_URL   = "postgresql://${var.db_username}:${var.db_password}@${var.aurora_endpoint}:5432/auth_db"
    JWT_SECRET          = var.jwt_secret
  }

  vpc_config = {
    subnet_ids         = var.aurora_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

resource "aws_lambda_function" "auth" {
  function_name = "${var.project}-auth"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-auth", Service = "auth" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "item" {
  function_name = "${var.project}-item"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-item", Service = "item" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "search" {
  function_name = "${var.project}-search"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-search", Service = "search" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "image" {
  function_name = "${var.project}-image"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-image", Service = "image" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "admin" {
  function_name = "${var.project}-admin"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-admin", Service = "admin" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

# ─────────────────────────────────────────────────────────────────────────────
# Event-Driven Lambda Workers (triggered by SQS)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_lambda_function" "search_indexer" {
  function_name = "${var.project}-search-indexer"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda-indexer.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-search-indexer", Service = "search-indexer" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "matching" {
  function_name = "${var.project}-matching"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda_handler.handler"
  runtime       = "python3.12"
  timeout       = 120
  memory_size   = 512
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-matching", Service = "matching" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_lambda_function" "notification" {
  function_name = "${var.project}-notification"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "lambda_handler.handler"
  runtime       = "python3.12"
  timeout       = 60
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }

  environment { variables = local.common_env }
  tags = { Name = "${var.project}-notification", Service = "notification" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

# ── SQS Event Source Mappings ────────────────────────────────────────────────

resource "aws_lambda_event_source_mapping" "search_indexer" {
  event_source_arn = var.search_queue_arn
  function_name    = aws_lambda_function.search_indexer.arn
  batch_size       = 10
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "matching" {
  event_source_arn = var.matching_queue_arn
  function_name    = aws_lambda_function.matching.arn
  batch_size       = 5
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "notification" {
  event_source_arn = var.notification_queue_arn
  function_name    = aws_lambda_function.notification.arn
  batch_size       = 5
  enabled          = true
}
