# ─────────────────────────────────────────────────────────────────────────────
# API Gateway HTTP API — Replaces Public ALB + Internal ALB + Nginx Gateway
# ─────────────────────────────────────────────────────────────────────────────
# Routes /api/* paths to Lambda functions. Built-in throttling, CORS, TLS.
# ─────────────────────────────────────────────────────────────────────────────

data "aws_region" "current" {}

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }

  tags = { Name = "${var.project}-api" }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      method         = "$context.httpMethod"
      path           = "$context.path"
      status         = "$context.status"
      latency        = "$context.responseLatency"
      integrationErr = "$context.integrationErrorMessage"
    })
  }

  tags = { Name = "${var.project}-api-default-stage" }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.project}-api"
  retention_in_days = 14
  tags              = { Name = "${var.project}-api-logs" }
}