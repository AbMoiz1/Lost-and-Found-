# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — CloudWatch Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: "docker logs <container>" and hoping you notice errors.
# No alerts, no dashboards, no metrics. If something breaks at 3am, nobody
# knows until users complain.
#
# SA EXAM NOTE:
#   - CloudWatch Logs: centralized log storage (replaces docker logs)
#   - CloudWatch Alarms: trigger actions when metrics cross thresholds
#   - Alarms can trigger: SNS notifications, Auto Scaling, Lambda
#   - DLQ alarm is critical — messages in DLQ = something is broken
# ─────────────────────────────────────────────────────────────────────────────

# ── ALARM SNS TOPIC (where alarm notifications go) ───────────────────────────
resource "aws_sns_topic" "alarms" {
  name = "${var.project}-alarms"
  tags = { Name = "${var.project}-alarms" }
}

# Subscribe your email to alarm notifications
resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ── ECS CPU ALARM ────────────────────────────────────────────────────────────
# Fires when cluster CPU utilization exceeds 80% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS cluster CPU > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
  }

  tags = { Name = "${var.project}-ecs-cpu-alarm" }
}

# ── ALB 5XX ALARM ────────────────────────────────────────────────────────────
# Fires when backend returns too many 5xx errors
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Public ALB 5xx errors > 10 in 10 minutes"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.public_alb_arn_suffix
  }

  tags = { Name = "${var.project}-alb-5xx-alarm" }
}

# ── DLQ ALARMS (one per dead-letter queue) ───────────────────────────────────
# Messages in DLQ = processing failures. This needs immediate attention.

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

  dimensions = {
    QueueName = "${var.project}-search-items-dlq"
  }

  tags = { Name = "${var.project}-dlq-search-alarm" }
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

  dimensions = {
    QueueName = "${var.project}-matching-items-dlq"
  }

  tags = { Name = "${var.project}-dlq-matching-alarm" }
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

  dimensions = {
    QueueName = "${var.project}-notification-matches-dlq"
  }

  tags = { Name = "${var.project}-dlq-notification-alarm" }
}

# ── RDS CPU ALARM ────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  for_each = toset(["auth", "item", "matching", "admin"])

  alarm_name          = "${var.project}-rds-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS ${each.key}-db CPU > 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = "${var.project}-${each.key}-db"
  }

  tags = { Name = "${var.project}-rds-${each.key}-cpu-alarm" }
}
