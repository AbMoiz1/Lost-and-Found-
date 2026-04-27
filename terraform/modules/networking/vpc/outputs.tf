# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — VPC Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# These outputs are consumed by almost every other module:
#   - Security Groups need vpc_id
#   - ALB needs public_subnet_ids
#   - RDS, Redis, OpenSearch, ECS need private_subnet_ids
# ─────────────────────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the 3 public subnets (one per AZ)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the 3 private subnets (one per AZ)"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "IDs of the 3 NAT Gateways (one per AZ)"
  value       = aws_nat_gateway.main[*].id
}

output "availability_zones" {
  description = "List of AZs used"
  value       = local.azs
}
