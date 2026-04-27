# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Security Group Rules
# ─────────────────────────────────────────────────────────────────────────────
# SA EXAM NOTE: We use security group ID references (chaining) instead of
# CIDR blocks. This means "allow traffic from any resource in that SG"
# regardless of IP changes. Critical for auto-scaling containers.
# ─────────────────────────────────────────────────────────────────────────────

# ── PUBLIC ALB RULES ─────────────────────────────────────────────────────────

resource "aws_vpc_security_group_ingress_rule" "public_alb_https" {
  security_group_id = aws_security_group.public_alb.id
  description       = "HTTPS from internet"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "public_alb_http" {
  security_group_id = aws_security_group.public_alb.id
  description       = "HTTP from internet (redirects to HTTPS)"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "public_alb_to_ecs" {
  security_group_id            = aws_security_group.public_alb.id
  description                  = "To ECS containers"
  from_port                    = 0
  to_port                      = 65535
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}

# ── INTERNAL ALB RULES ───────────────────────────────────────────────────────

resource "aws_vpc_security_group_ingress_rule" "internal_alb_from_ecs" {
  security_group_id            = aws_security_group.internal_alb.id
  description                  = "From ECS containers (Nginx Gateway)"
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}

resource "aws_vpc_security_group_egress_rule" "internal_alb_to_ecs" {
  security_group_id            = aws_security_group.internal_alb.id
  description                  = "To ECS service containers"
  from_port                    = 0
  to_port                      = 65535
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
}

# ── ECS RULES ────────────────────────────────────────────────────────────────

resource "aws_vpc_security_group_ingress_rule" "ecs_from_public_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "From Public ALB to Nginx Gateway (dynamic ports)"
  from_port                    = 32768
  to_port                      = 65535
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.public_alb.id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_internal_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "From Internal ALB to backend services (dynamic ports)"
  from_port                    = 32768
  to_port                      = 65535
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.internal_alb.id
}
