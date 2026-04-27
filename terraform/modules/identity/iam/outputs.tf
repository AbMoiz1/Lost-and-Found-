# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — IAM Module Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "execution_role_arn" {
  description = "ECS execution role ARN (shared by all tasks)"
  value       = aws_iam_role.ecs_execution.arn
}

output "task_role_arns" {
  description = "Map of task role ARNs per service"
  value = {
    gateway      = aws_iam_role.gateway.arn
    auth         = aws_iam_role.auth.arn
    item         = aws_iam_role.item.arn
    search       = aws_iam_role.search.arn
    image        = aws_iam_role.image.arn
    admin        = aws_iam_role.admin.arn
    matching     = aws_iam_role.matching.arn
    notification = aws_iam_role.notification.arn
  }
}
