# ─────────────────────────────────────────────────────────────────────────────
# API Gateway Routes — path-based routing to Lambda functions
# Replaces ALB listener rules + Nginx location blocks
# ─────────────────────────────────────────────────────────────────────────────

# ── Lambda Integrations ──────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arns["auth"]
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "item" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arns["item"]
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "search" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arns["search"]
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "image" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arns["image"]
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_invoke_arns["admin"]
  payload_format_version = "2.0"
}

# ── Routes ───────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "auth" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/auth/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "items" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/items/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.item.id}"
}

resource "aws_apigatewayv2_route" "search" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/search/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.search.id}"
}

resource "aws_apigatewayv2_route" "images" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/images/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.image.id}"
}

resource "aws_apigatewayv2_route" "admin" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/admin/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

# ── Lambda Permissions (allow API GW to invoke each Lambda) ──────────────────

resource "aws_lambda_permission" "auth" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["auth"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "item" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["item"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "search" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["search"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "image" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["image"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "admin" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["admin"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
