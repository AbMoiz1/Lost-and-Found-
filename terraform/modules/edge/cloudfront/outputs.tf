output "distribution_domain_name" {
  description = "CloudFront distribution domain (user-facing URL)"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.main.arn
}

output "distribution_hosted_zone_id" {
  value = aws_cloudfront_distribution.main.hosted_zone_id
}
