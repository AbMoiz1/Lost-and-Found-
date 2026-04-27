output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "asg_name" {
  value = aws_autoscaling_group.ecs.name
}
