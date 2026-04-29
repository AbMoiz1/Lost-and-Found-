# ─────────────────────────────────────────────────────────────────────────────
# Route 53 — Updated for serverless (health check on API Gateway)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  count   = var.domain_name != "" ? 1 : 0
  name    = var.domain_name
  comment = "${var.project} hosted zone"
  tags    = { Name = "${var.project}-zone" }
}

resource "aws_route53_record" "cloudfront" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# Health check on API Gateway endpoint
resource "aws_route53_health_check" "api" {
  count = var.domain_name != "" ? 1 : 0

  fqdn              = replace(var.api_gateway_endpoint, "https://", "")
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/auth/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "${var.project}-api-health-check" }
}
