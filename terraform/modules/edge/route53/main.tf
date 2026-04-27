# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Route 53 Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: localhost. No DNS, no domain name.
# Route 53 maps a real domain to your CloudFront distribution.
#
# SA EXAM NOTE:
#   - Alias record vs CNAME: Alias is free for AWS resources (CloudFront,
#     ALB, S3), resolves at the DNS level (no extra hop). CNAME costs money
#     and adds a redirect. Always use Alias for AWS resources.
#   - Routing policies: simple, weighted, latency, failover, geolocation
#   - Health checks: Route 53 can check if your ALB is healthy and
#     automatically failover to DR region if primary dies
#   - Hosted zone = container for DNS records for one domain
# ─────────────────────────────────────────────────────────────────────────────

# Only create Route 53 resources if a domain name is provided
resource "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name    = var.domain_name
  comment = "${var.project} hosted zone"

  tags = { Name = "${var.project}-zone" }
}

# A record pointing domain to CloudFront (Alias — free, no extra hop)
resource "aws_route53_record" "cloudfront" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# www subdomain → same CloudFront distribution
resource "aws_route53_record" "www" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# Health check on Public ALB (for future failover routing to DR)
resource "aws_route53_health_check" "alb" {
  count = var.domain_name != "" ? 1 : 0

  fqdn              = var.public_alb_dns
  port               = 80
  type               = "HTTP"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = { Name = "${var.project}-alb-health-check" }
}
