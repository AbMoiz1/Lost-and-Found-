output "zone_id" {
  description = "Route 53 hosted zone ID"
  value       = length(aws_route53_zone.main) > 0 ? aws_route53_zone.main[0].zone_id : ""
}

output "name_servers" {
  description = "Name servers for the hosted zone (point your domain registrar here)"
  value       = length(aws_route53_zone.main) > 0 ? aws_route53_zone.main[0].name_servers : []
}
