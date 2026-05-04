output "cluster_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "reader_endpoint" {
  value = aws_rds_cluster.main.reader_endpoint
}

output "cluster_arn" {
  value = aws_rds_cluster.main.arn
}

output "cluster_id" {
  value = aws_rds_cluster.main.id
}

output "vpc_id" {
  value = aws_vpc.aurora.id
}

output "subnet_ids" {
  value = aws_subnet.aurora[*].id
}

output "security_group_id" {
  value = aws_security_group.aurora.id
}

output "master_username" {
  value = aws_rds_cluster.main.master_username
}

output "global_cluster_id" {
  value = aws_rds_global_cluster.main.id
}
