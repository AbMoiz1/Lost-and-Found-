# ─────────────────────────────────────────────────────────────────────────────
# CloudWatch — Updated for serverless (Lambda + API Gateway metrics)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_sns_topic" "alarms" {
  name = "${var.project}-alarms"
  tags = { Name = "${var.project}-alarms" }
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ── Lambda Error Alarms (one per function) ───────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = toset(var.lambda_function_names)

  alarm_name          = "${var.project}-lambda-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda ${each.key} errors > 5 in 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = { FunctionName = each.key }
  tags = { Name = "${var.project}-lambda-${each.key}-errors" }
}

# ── API Gateway 5XX Alarm ────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.project}-api-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5xx errors > 10 in 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = { ApiId = var.api_gateway_id }
  tags = { Name = "${var.project}-api-5xx-alarm" }
}

# ── DLQ Alarms (kept from original) ─────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "dlq_search" {
  alarm_name          = "${var.project}-dlq-search-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Search DLQ has messages — indexing failures"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = "${var.project}-search-items-dlq" }
  tags                = { Name = "${var.project}-dlq-search-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "dlq_matching" {
  alarm_name          = "${var.project}-dlq-matching-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Matching DLQ has messages — scoring failures"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = "${var.project}-matching-items-dlq" }
  tags                = { Name = "${var.project}-dlq-matching-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "dlq_notification" {
  alarm_name          = "${var.project}-dlq-notification-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Notification DLQ has messages — email delivery failures"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = "${var.project}-notification-matches-dlq" }
  tags                = { Name = "${var.project}-dlq-notification-alarm" }
}
