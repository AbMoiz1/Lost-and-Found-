variable "project" { type = string }
variable "domain_name" { type = string }
variable "cloudfront_domain_name" { type = string }
variable "cloudfront_hosted_zone_id" { type = string }
variable "api_gateway_endpoint" { type = string }
variable "dr_api_endpoint" {
  type        = string
  default     = ""
  description = "DR API Gateway endpoint for failover"
}
