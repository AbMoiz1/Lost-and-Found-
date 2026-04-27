# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Internal ALB Target Groups + Path Rules
# ─────────────────────────────────────────────────────────────────────────────
# These replace Docker DNS resolution. Locally, Nginx Gateway sends to
# http://auth:4001. On AWS, Internal ALB routes /api/auth/* to the Auth
# target group, which contains healthy Auth containers.
# ─────────────────────────────────────────────────────────────────────────────

# ── TARGET GROUPS (one per backend service) ──────────────────────────────────

resource "aws_lb_target_group" "auth" {
  name     = "${var.project}-auth-tg"
  port     = 4001
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "${var.project}-auth-tg" }
}

resource "aws_lb_target_group" "item" {
  name     = "${var.project}-item-tg"
  port     = 4002
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "${var.project}-item-tg" }
}

resource "aws_lb_target_group" "search" {
  name     = "${var.project}-search-tg"
  port     = 4003
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "${var.project}-search-tg" }
}

resource "aws_lb_target_group" "image" {
  name     = "${var.project}-image-tg"
  port     = 4004
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "${var.project}-image-tg" }
}

resource "aws_lb_target_group" "admin" {
  name     = "${var.project}-admin-tg"
  port     = 4005
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }

  tags = { Name = "${var.project}-admin-tg" }
}

# ── PATH-BASED ROUTING RULES ────────────────────────────────────────────────
# These replace the Nginx gateway location blocks:
#   location /api/auth/  → proxy_pass http://auth:4001
#   location /api/items/ → proxy_pass http://item:4002
#   etc.

resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth.arn
  }

  condition {
    path_pattern { values = ["/api/auth/*"] }
  }
}

resource "aws_lb_listener_rule" "item" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.item.arn
  }

  condition {
    path_pattern { values = ["/api/items/*"] }
  }
}

resource "aws_lb_listener_rule" "search" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.search.arn
  }

  condition {
    path_pattern { values = ["/api/search/*"] }
  }
}

resource "aws_lb_listener_rule" "image" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.image.arn
  }

  condition {
    path_pattern { values = ["/api/images/*"] }
  }
}

resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 500

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    path_pattern { values = ["/api/admin/*"] }
  }
}
