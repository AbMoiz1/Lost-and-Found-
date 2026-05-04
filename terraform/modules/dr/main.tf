# ─────────────────────────────────────────────────────────────────────────────
# Disaster Recovery Region (us-west-2) — Warm Standby
# ─────────────────────────────────────────────────────────────────────────────
# RPO < 5 min (Aurora Global DB replication lag)
# RTO < 30 min (Route 53 health check → failover → Lambda scales up)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.dr]
    }
  }
}

data "aws_availability_zones" "dr" {
  provider = aws.dr
  state    = "available"
}

# ── DR VPC (mirrors Aurora VPC in primary) ───────────────────────────────────

resource "aws_vpc" "dr" {
  provider             = aws.dr
  cidr_block           = "10.97.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-dr-vpc" }
}

resource "aws_subnet" "dr" {
  provider          = aws.dr
  count             = 2
  vpc_id            = aws_vpc.dr.id
  cidr_block        = cidrsubnet("10.97.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.dr.names[count.index]
  tags              = { Name = "${var.project}-dr-subnet-${count.index}" }
}

resource "aws_internet_gateway" "dr" {
  provider = aws.dr
  vpc_id   = aws_vpc.dr.id
  tags     = { Name = "${var.project}-dr-igw" }
}

resource "aws_eip" "dr_nat" {
  provider = aws.dr
  domain   = "vpc"
  tags     = { Name = "${var.project}-dr-nat-eip" }
}

resource "aws_subnet" "dr_public" {
  provider                = aws.dr
  vpc_id                  = aws_vpc.dr.id
  cidr_block              = cidrsubnet("10.97.0.0/16", 8, 10)
  availability_zone       = data.aws_availability_zones.dr.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-dr-public-subnet" }
}

resource "aws_nat_gateway" "dr" {
  provider      = aws.dr
  allocation_id = aws_eip.dr_nat.id
  subnet_id     = aws_subnet.dr_public.id
  tags          = { Name = "${var.project}-dr-nat" }
  depends_on    = [aws_internet_gateway.dr]
}

resource "aws_route_table" "dr_public" {
  provider = aws.dr
  vpc_id   = aws_vpc.dr.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dr.id
  }
  tags = { Name = "${var.project}-dr-public-rt" }
}

resource "aws_route_table_association" "dr_public" {
  provider       = aws.dr
  subnet_id      = aws_subnet.dr_public.id
  route_table_id = aws_route_table.dr_public.id
}

resource "aws_route_table" "dr_private" {
  provider = aws.dr
  vpc_id   = aws_vpc.dr.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.dr.id
  }
  tags = { Name = "${var.project}-dr-private-rt" }
}

resource "aws_route_table_association" "dr_private" {
  provider       = aws.dr
  count          = 2
  subnet_id      = aws_subnet.dr[count.index].id
  route_table_id = aws_route_table.dr_private.id
}

# ── DR Security Group ─────────────────────────────────────────────────────────

resource "aws_security_group" "dr_lambda" {
  provider    = aws.dr
  name        = "${var.project}-dr-lambda-sg"
  description = "DR Lambda functions"
  vpc_id      = aws_vpc.dr.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-dr-lambda-sg" }
}

# ── Aurora Global Database — DR secondary cluster ────────────────────────────

resource "aws_db_subnet_group" "dr" {
  provider   = aws.dr
  name       = "${var.project}-dr-aurora-subnet-group"
  subnet_ids = aws_subnet.dr[*].id
  tags       = { Name = "${var.project}-dr-aurora-subnet-group" }
}

resource "aws_security_group" "dr_aurora" {
  provider    = aws.dr
  name        = "${var.project}-dr-aurora-sg"
  description = "DR Aurora"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-dr-aurora-sg" }
}

resource "aws_rds_cluster" "dr" {
  provider                  = aws.dr
  cluster_identifier        = "${var.project}-dr-aurora-cluster"
  engine                    = "aurora-postgresql"
  engine_mode               = "provisioned"
  engine_version            = "16.4"
  global_cluster_identifier = var.aurora_global_cluster_id
  db_subnet_group_name      = aws_db_subnet_group.dr.name
  vpc_security_group_ids    = [aws_security_group.dr_aurora.id]
  skip_final_snapshot       = true
  deletion_protection       = false

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }

  tags = { Name = "${var.project}-dr-aurora-cluster" }

  lifecycle {
    ignore_changes = [replication_source_identifier, master_username, master_password]
  }
}

resource "aws_rds_cluster_instance" "dr_reader" {
  provider           = aws.dr
  identifier         = "${var.project}-dr-aurora-reader"
  cluster_identifier = aws_rds_cluster.dr.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.dr.engine
  engine_version     = aws_rds_cluster.dr.engine_version
  tags               = { Name = "${var.project}-dr-aurora-reader" }
}

# ── DR Lambda IAM Role ────────────────────────────────────────────────────────

resource "aws_iam_role" "dr_lambda" {
  provider = aws.dr
  name     = "${var.project}-dr-lambda-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project}-dr-lambda-execution" }
}

resource "aws_iam_role_policy_attachment" "dr_lambda_basic" {
  provider   = aws.dr
  role       = aws_iam_role.dr_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ── DR Lambda placeholder (scaled up on failover) ────────────────────────────

data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"
  source {
    content  = "exports.handler = async () => ({ statusCode: 503, body: 'DR standby' });"
    filename = "index.js"
  }
}

resource "aws_lambda_function" "dr_auth" {
  provider      = aws.dr
  function_name = "${var.project}-dr-auth"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = aws_subnet.dr[*].id
    security_group_ids = [aws_security_group.dr_lambda.id]
  }

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.dr.reader_endpoint
      PGPORT     = "5432"
      PGUSER     = "dbadmin"
      PGPASSWORD = var.db_master_password
      PGDATABASE = "auth_db"
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = { Name = "${var.project}-dr-auth" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

# ── DR API Gateway ────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "dr" {
  provider      = aws.dr
  name          = "${var.project}-dr-api"
  protocol_type = "HTTP"
  tags          = { Name = "${var.project}-dr-api" }
}

resource "aws_apigatewayv2_stage" "dr" {
  provider    = aws.dr
  api_id      = aws_apigatewayv2_api.dr.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.dr_api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      error          = "$context.error.message"
    })
  }

  tags = { Name = "${var.project}-dr-api-stage" }

  depends_on = [aws_cloudwatch_log_group.dr_api]
}

resource "aws_apigatewayv2_integration" "dr_auth" {
  provider               = aws.dr
  api_id                 = aws_apigatewayv2_api.dr.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dr_auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dr_auth" {
  provider  = aws.dr
  api_id    = aws_apigatewayv2_api.dr.id
  route_key = "ANY /api/auth/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.dr_auth.id}"
}

resource "aws_lambda_permission" "dr_auth" {
  provider      = aws.dr
  statement_id  = "AllowDRAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dr.execution_arn}/*/*"
}

# ── DR Lambda: Item Service ────────────────────────────────────────────────────

resource "aws_lambda_function" "dr_item" {
  provider      = aws.dr
  function_name = "${var.project}-dr-item"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = aws_subnet.dr[*].id
    security_group_ids = [aws_security_group.dr_lambda.id]
  }

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.dr.endpoint
      PGPORT     = "5432"
      PGUSER     = "dbadmin"
      PGPASSWORD = var.db_master_password
      PGDATABASE = "item_db"
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = { Name = "${var.project}-dr-item" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_apigatewayv2_integration" "dr_item" {
  provider               = aws.dr
  api_id                 = aws_apigatewayv2_api.dr.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dr_item.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dr_item" {
  provider  = aws.dr
  api_id    = aws_apigatewayv2_api.dr.id
  route_key = "ANY /api/items/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.dr_item.id}"
}

resource "aws_lambda_permission" "dr_item" {
  provider      = aws.dr
  statement_id  = "AllowDRAPIGatewayItem"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_item.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dr.execution_arn}/*/*"
}

# ── DR Lambda: Search Service ──────────────────────────────────────────────────

resource "aws_lambda_function" "dr_search" {
  provider      = aws.dr
  function_name = "${var.project}-dr-search"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = aws_subnet.dr[*].id
    security_group_ids = [aws_security_group.dr_lambda.id]
  }

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.dr.endpoint
      PGPORT     = "5432"
      PGUSER     = "dbadmin"
      PGPASSWORD = var.db_master_password
      PGDATABASE = "item_db"
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = { Name = "${var.project}-dr-search" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_apigatewayv2_integration" "dr_search" {
  provider               = aws.dr
  api_id                 = aws_apigatewayv2_api.dr.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dr_search.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dr_search" {
  provider  = aws.dr
  api_id    = aws_apigatewayv2_api.dr.id
  route_key = "ANY /api/search/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.dr_search.id}"
}

resource "aws_lambda_permission" "dr_search" {
  provider      = aws.dr
  statement_id  = "AllowDRAPIGatewaySearch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_search.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dr.execution_arn}/*/*"
}

# ── DR Lambda: Image Service ───────────────────────────────────────────────────

resource "aws_lambda_function" "dr_image" {
  provider      = aws.dr
  function_name = "${var.project}-dr-image"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = aws_subnet.dr[*].id
    security_group_ids = [aws_security_group.dr_lambda.id]
  }

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.dr.endpoint
      PGPORT     = "5432"
      PGUSER     = "dbadmin"
      PGPASSWORD = var.db_master_password
      PGDATABASE = "item_db"
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = { Name = "${var.project}-dr-image" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_apigatewayv2_integration" "dr_image" {
  provider               = aws.dr
  api_id                 = aws_apigatewayv2_api.dr.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dr_image.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dr_image" {
  provider  = aws.dr
  api_id    = aws_apigatewayv2_api.dr.id
  route_key = "ANY /api/images/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.dr_image.id}"
}

resource "aws_lambda_permission" "dr_image" {
  provider      = aws.dr
  statement_id  = "AllowDRAPIGatewayImage"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_image.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dr.execution_arn}/*/*"
}

# ── DR Lambda: Admin Service ───────────────────────────────────────────────────

resource "aws_lambda_function" "dr_admin" {
  provider      = aws.dr
  function_name = "${var.project}-dr-admin"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256
  filename      = data.archive_file.placeholder.output_path

  vpc_config {
    subnet_ids         = aws_subnet.dr[*].id
    security_group_ids = [aws_security_group.dr_lambda.id]
  }

  environment {
    variables = {
      PGHOST     = aws_rds_cluster.dr.endpoint
      PGPORT     = "5432"
      PGUSER     = "dbadmin"
      PGPASSWORD = var.db_master_password
      PGDATABASE = "admin_db"
      JWT_SECRET = var.jwt_secret
    }
  }

  tags = { Name = "${var.project}-dr-admin" }
  lifecycle { ignore_changes = [filename, source_code_hash] }
}

resource "aws_apigatewayv2_integration" "dr_admin" {
  provider               = aws.dr
  api_id                 = aws_apigatewayv2_api.dr.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dr_admin.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dr_admin" {
  provider  = aws.dr
  api_id    = aws_apigatewayv2_api.dr.id
  route_key = "ANY /api/admin/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.dr_admin.id}"
}

resource "aws_lambda_permission" "dr_admin" {
  provider      = aws.dr
  statement_id  = "AllowDRAPIGatewayAdmin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dr_admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dr.execution_arn}/*/*"
}

# ── DR CloudWatch Logs for API Gateway ────────────────────────────────────────

resource "aws_cloudwatch_log_group" "dr_api" {
  provider            = aws.dr
  name                = "/aws/apigatewayv2/${var.project}-dr-api"
  retention_in_days   = 7
  tags                = { Name = "${var.project}-dr-api-logs" }
}

# ── DR CloudWatch Alarms for Lambda Errors ──────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "dr_lambda_errors" {
  provider            = aws.dr
  alarm_name          = "${var.project}-dr-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alarm when DR Lambda functions have errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.dr_auth.function_name
  }

  tags = { Name = "${var.project}-dr-lambda-errors-alarm" }
}

# ── DR VPC Endpoint for RDS (cross-region read replica support) ───────────────

resource "aws_security_group" "dr_vpc_endpoint" {
  provider    = aws.dr
  name        = "${var.project}-dr-vpc-endpoint-sg"
  description = "Security group for VPC Endpoints"
  vpc_id      = aws_vpc.dr.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.dr_lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-dr-vpc-endpoint-sg" }
}

# ── DR Health Check for Route 53 Failover (CloudWatch Alarm-based) ────────────

# Create CloudWatch alarm based health check that monitors Lambda errors
resource "aws_cloudwatch_metric_alarm" "dr_api_health" {
  provider            = aws.dr
  alarm_name          = "${var.project}-dr-api-health"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Triggers when DR API health is degraded"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.dr_auth.function_name
  }

  tags = { Name = "${var.project}-dr-health-alarm" }
}
