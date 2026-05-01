output "pipeline_name" {
  value = aws_codepipeline.main.name
}

output "pipeline_arn" {
  value = aws_codepipeline.main.arn
}

output "github_connection_arn" {
  value = aws_codestarconnections_connection.github.arn
}

output "github_connection_status" {
  value = aws_codestarconnections_connection.github.connection_status
}

output "webhook_url" {
  description = "Add this URL as a GitHub webhook on your repo"
  value       = aws_codepipeline_webhook.github.url
}
