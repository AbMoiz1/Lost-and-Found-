# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — S3 Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Used by:
#   - CloudFront module (frontend bucket as origin)
#   - ECS module (Image Service needs bucket name)
#   - IAM module (Image Service role needs bucket ARN)
#   - CI/CD module (CodeBuild syncs frontend build to S3)
# ─────────────────────────────────────────────────────────────────────────────

output "images_bucket_name" {
  description = "Name of the images S3 bucket"
  value       = aws_s3_bucket.images.id
}

output "images_bucket_arn" {
  description = "ARN of the images S3 bucket (for IAM policies)"
  value       = aws_s3_bucket.images.arn
}

output "frontend_bucket_name" {
  description = "Name of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "ARN of the frontend S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_regional_domain" {
  description = "Regional domain name of frontend bucket (for CloudFront origin)"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "frontend_website_endpoint" {
  description = "S3 website endpoint for the frontend bucket"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "cloudfront_oai_iam_arn" {
  description = "IAM ARN of the CloudFront OAI (for bucket policy)"
  value       = aws_cloudfront_origin_access_identity.frontend.iam_arn
}

output "cloudfront_oai_path" {
  description = "CloudFront OAI path (for CloudFront origin config)"
  value       = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
}
