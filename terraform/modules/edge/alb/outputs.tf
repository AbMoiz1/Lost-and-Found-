output "public_alb_dns" {
  description = "Public ALB DNS name (internet entry point)"
  value       = aws_lb.public.dns_name
}

output "public_alb_arn" {
  value = aws_lb.public.arn
}

output "internal_alb_dns" {
  description = "Internal ALB DNS name (service-to-service)"
  value       = aws_lb.internal.dns_name
}

output "internal_alb_arn" {
  value = aws_lb.internal.arn
}

output "gateway_target_group_arn" {
  value = aws_lb_target_group.gateway.arn
}

output "target_group_arns" {
  description = "Map of target group ARNs per service"
  value = {
    gateway = aws_lb_target_group.gateway.arn
    auth    = aws_lb_target_group.auth.arn
    item    = aws_lb_target_group.item.arn
    search  = aws_lb_target_group.search.arn
    image   = aws_lb_target_group.image.arn
    admin   = aws_lb_target_group.admin.arn
  }
}

output "public_alb_arn_suffix" {
  value = aws_lb.public.arn_suffix
}
