# ─────────────────────────────────────────────────────────────────────────────
# Route 53 — DNS with health check failover to DR region
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  count   = var.domain_name != "" ? 1 : 0
  name    = var.domain_name
  comment = "${var.project} hosted zone"
  tags    = { Name = "${var.project}-zone" }
}

# Primary record — points to CloudFront (primary region)
resource "aws_route53_record" "primary" {
  count          = var.domain_name != "" ? 1 : 0
  zone_id        = aws_route53_zone.main[0].zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "primary"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary[0].id
}

# Secondary (DR) record — points to DR API Gateway
resource "aws_route53_record" "dr" {
  count          = var.domain_name != "" && var.dr_api_endpoint != "" ? 1 : 0
  zone_id        = aws_route53_zone.main[0].zone_id
  name           = var.domain_name
  type           = "A"
  set_identifier = "dr"

  alias {
    name                   = replace(var.dr_api_endpoint, "https://", "")
    zone_id                = "Z2OJLYMUO9EFXC" # API Gateway hosted zone for us-west-2
    evaluate_target_health = false
  }

  failover_routing_policy {
    type = "SECONDARY"
  }
}

# www subdomain → primary CloudFront
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

# Health check on primary API Gateway
resource "aws_route53_health_check" "primary" {
  count             = var.domain_name != "" ? 1 : 0
  fqdn              = replace(var.api_gateway_endpoint, "https://", "")
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/auth/health"
  failure_threshold = 3
  request_interval  = 30
  tags              = { Name = "${var.project}-primary-health-check" }
}
