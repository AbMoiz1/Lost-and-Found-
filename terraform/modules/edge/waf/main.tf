# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — WAF Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: Nginx limit_req_zone (100 req/min per IP). That's it.
# No SQL injection protection, no XSS protection, no bot blocking.
#
# SA EXAM NOTE:
#   - WAF inspects HTTP content (Layer 7). Security Groups only check IP/port.
#   - Managed rule groups: AWS maintains rules for OWASP Top 10 threats
#   - Rate-based rules: block IPs exceeding request threshold
#   - WAF can attach to ALB, CloudFront, or API Gateway
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project}-waf"
  scope = "REGIONAL" # REGIONAL for ALB, CLOUDFRONT for CloudFront

  default_action {
    allow {}
  }

  # ── AWS Managed Rules: Common Rule Set (OWASP Top 10) ──────────────────
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-common-rules"
    }
  }

  # ── AWS Managed Rules: SQL Injection ───────────────────────────────────
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-sqli-rules"
    }
  }

  # ── Rate Limiting: 100 requests per 5 minutes per IP ──────────────────
  # Replaces Nginx limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m
  rule {
    name     = "RateLimit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500 # per 5-minute window
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-rate-limit"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf"
  }

  tags = { Name = "${var.project}-waf" }
}

# Attach WAF to Public ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.public_alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
