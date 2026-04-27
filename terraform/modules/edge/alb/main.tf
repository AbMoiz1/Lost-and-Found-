# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — ALB Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT:
#   Public ALB  → Gateway Nginx (:8080) as internet entry point
#   Internal ALB → Docker DNS (http://auth:4001, http://item:4002, etc.)
#
# SA EXAM NOTE:
#   - ALB is Layer 7 (HTTP/HTTPS) — routes by URL path, host header
#   - NLB is Layer 4 (TCP/UDP) — faster but no content-based routing
#   - Path-based routing replaces Nginx location blocks
#   - Health checks replace docker-compose healthcheck
#   - Cross-zone load balancing distributes evenly across all AZs
# ─────────────────────────────────────────────────────────────────────────────

# ── PUBLIC ALB (internet-facing) ─────────────────────────────────────────────
resource "aws_lb" "public" {
  name               = "${var.project}-public-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.public_alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = { Name = "${var.project}-public-alb" }
}

# Public ALB listener on port 80 (HTTP)
# In production, this would redirect to HTTPS. For dev, we forward directly.
resource "aws_lb_listener" "public_http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }
}

# Gateway target group — Public ALB forwards to Nginx Gateway containers
resource "aws_lb_target_group" "gateway" {
  name     = "${var.project}-gateway-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = { Name = "${var.project}-gateway-tg" }
}

# ── INTERNAL ALB (private, service-to-service) ───────────────────────────────
resource "aws_lb" "internal" {
  name               = "${var.project}-internal-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [var.internal_alb_sg_id]
  subnets            = var.private_subnet_ids

  tags = { Name = "${var.project}-internal-alb" }
}

# Internal ALB listener on port 80
resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\":\"NOT_FOUND\"}"
      status_code  = "404"
    }
  }
}
