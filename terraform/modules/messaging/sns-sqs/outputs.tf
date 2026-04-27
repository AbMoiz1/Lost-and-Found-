# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — Messaging Module Outputs
# ─────────────────────────────────────────────────────────────────────────────
# Used by:
#   - ECS module (task definitions need topic ARNs and queue URLs)
#   - IAM module (per-service permissions: who can publish/consume)
#   - CloudWatch module (alarms on DLQ message count)
# ─────────────────────────────────────────────────────────────────────────────

# SNS Topic ARNs — services publish to these
output "items_topic_arn" {
  description = "ARN of the items SNS topic (Item Service publishes here)"
  value       = aws_sns_topic.items.arn
}

output "matches_topic_arn" {
  description = "ARN of the matches SNS topic (Matching Service publishes here)"
  value       = aws_sns_topic.matches.arn
}

# SQS Queue URLs — services poll these
output "search_items_queue_url" {
  description = "URL of the search-items SQS queue (Search Service polls)"
  value       = aws_sqs_queue.search_items.url
}

output "matching_items_queue_url" {
  description = "URL of the matching-items SQS queue (Matching Service polls)"
  value       = aws_sqs_queue.matching_items.url
}

output "notification_matches_queue_url" {
  description = "URL of the notification-matches SQS queue (Notification Service polls)"
  value       = aws_sqs_queue.notification_matches.url
}

# SQS Queue ARNs — for IAM policies
output "search_items_queue_arn" {
  value = aws_sqs_queue.search_items.arn
}

output "matching_items_queue_arn" {
  value = aws_sqs_queue.matching_items.arn
}

output "notification_matches_queue_arn" {
  value = aws_sqs_queue.notification_matches.arn
}

# DLQ ARNs — for CloudWatch alarms
output "dlq_arns" {
  description = "Dead-letter queue ARNs for monitoring"
  value = {
    search       = aws_sqs_queue.search_items_dlq.arn
    matching     = aws_sqs_queue.matching_items_dlq.arn
    notification = aws_sqs_queue.notification_matches_dlq.arn
  }
}
