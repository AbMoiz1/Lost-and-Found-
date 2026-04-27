# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — CloudFront Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: Frontend Nginx container (:3000) serves React app and
# proxies /api/* to Gateway. CloudFront replaces this with:
#   - S3 origin for static files (React app)
#   - ALB origin for /api/* requests
#
# SA EXAM NOTE:
#   - CloudFront has 400+ edge locations worldwide for low latency
#   - Behaviors = Nginx location blocks (path-based routing to origins)
#   - OAI restricts direct S3 access — users must go through CloudFront
#   - Cache invalidation needed after frontend deploys
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.project} distribution"

  # ── S3 ORIGIN (frontend static files) ──────────────────────────────────
  origin {
    domain_name = var.frontend_bucket_regional_domain
    origin_id   = "s3-frontend"

    s3_origin_config {
      origin_access_identity = var.cloudfront_oai_path
    }
  }

  # ── ALB ORIGIN (API requests) ──────────────────────────────────────────
  origin {
    domain_name = var.public_alb_dns
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # ALB listener is HTTP for dev
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ── DEFAULT BEHAVIOR: /* → S3 (cached static files) ───────────────────
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400  # 24 hours
    max_ttl     = 604800 # 7 days
  }

  # ── /api/* BEHAVIOR → ALB (no cache, forward everything) ──────────────
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-api"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host", "Origin"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0 # no caching for API
    max_ttl     = 0
  }

  # SPA routing — return index.html for 403/404 (React Router handles routes)
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # use default *.cloudfront.net cert for dev
  }

  tags = { Name = "${var.project}-distribution" }
}
