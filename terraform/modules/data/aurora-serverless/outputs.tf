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
