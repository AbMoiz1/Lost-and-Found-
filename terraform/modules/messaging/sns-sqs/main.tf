# ─────────────────────────────────────────────────────────────────────────────
# Moiz Lost and Found Webapp — SNS + SQS Messaging Module
# ─────────────────────────────────────────────────────────────────────────────
# LOCAL EQUIVALENT: RabbitMQ with fanout exchanges.
#   "items" exchange → Search Service + Matching Service queues
#   "matches" exchange → Notification Service queue
#
# SA EXAM NOTE:
#   - SNS = pub/sub, push-based. Replaces RabbitMQ fanout exchanges.
#   - SQS = queue, pull-based. Consumers poll for messages.
#   - SNS → SQS fan-out: one publish, multiple consumers. AWS-native pattern.
#   - DLQ: after N failed attempts, message moves to DLQ for inspection.
#   - Visibility timeout: message invisible to other consumers while processing.
#   - Long polling (20s): reduces empty responses and API costs.
#   - Both are serverless — no broker container, scales automatically.
# ─────────────────────────────────────────────────────────────────────────────

# ── SNS TOPICS (the broadcasters) ────────────────────────────────────────────

resource "aws_sns_topic" "items" {
  name = "${var.project}-items-topic"
  tags = { Name = "${var.project}-items-topic" }
}

resource "aws_sns_topic" "matches" {
  name = "${var.project}-matches-topic"
  tags = { Name = "${var.project}-matches-topic" }
}

# ── DEAD-LETTER QUEUES (catch failed messages after 3 retries) ───────────────

resource "aws_sqs_queue" "search_items_dlq" {
  name                      = "${var.project}-search-items-dlq"
  message_retention_seconds = 1209600 # 14 days — keep failed messages for investigation
  tags                      = { Name = "${var.project}-search-items-dlq" }
}

resource "aws_sqs_queue" "matching_items_dlq" {
  name                      = "${var.project}-matching-items-dlq"
  message_retention_seconds = 1209600
  tags                      = { Name = "${var.project}-matching-items-dlq" }
}

resource "aws_sqs_queue" "notification_matches_dlq" {
  name                      = "${var.project}-notification-matches-dlq"
  message_retention_seconds = 1209600
  tags                      = { Name = "${var.project}-notification-matches-dlq" }
}

# ── MAIN QUEUES (consumers poll these) ───────────────────────────────────────

resource "aws_sqs_queue" "search_items" {
  name                       = "${var.project}-search-items-queue"
  visibility_timeout_seconds = 60  # message invisible for 60s while processing
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 20  # long polling — wait up to 20s for a message

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.search_items_dlq.arn
    maxReceiveCount     = 3 # after 3 failures → move to DLQ
  })

  tags = { Name = "${var.project}-search-items-queue" }
}

resource "aws_sqs_queue" "matching_items" {
  name                       = "${var.project}-matching-items-queue"
  visibility_timeout_seconds = 120 # matching takes longer — scoring algorithm
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.matching_items_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = "${var.project}-matching-items-queue" }
}

resource "aws_sqs_queue" "notification_matches" {
  name                       = "${var.project}-notification-matches-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_matches_dlq.arn
    maxReceiveCount     = 3 # matches Notification Service's 3-retry pattern locally
  })

  tags = { Name = "${var.project}-notification-matches-queue" }
}

# ── SNS → SQS SUBSCRIPTIONS (the wiring) ────────────────────────────────────
# items-topic fans out to search + matching queues
# matches-topic fans out to notification queue

resource "aws_sns_topic_subscription" "items_to_search" {
  topic_arn = aws_sns_topic.items.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.search_items.arn
  raw_message_delivery = true # deliver raw JSON, not wrapped in SNS envelope
}

resource "aws_sns_topic_subscription" "items_to_matching" {
  topic_arn = aws_sns_topic.items.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.matching_items.arn
  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "matches_to_notification" {
  topic_arn = aws_sns_topic.matches.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.notification_matches.arn
  raw_message_delivery = true
}

# ── QUEUE POLICIES (allow SNS to write to SQS) ──────────────────────────────
# Without these, SNS can't push messages into the queues.

resource "aws_sqs_queue_policy" "search_items_policy" {
  queue_url = aws_sqs_queue.search_items.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.search_items.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.items.arn }
      }
    }]
  })
}

resource "aws_sqs_queue_policy" "matching_items_policy" {
  queue_url = aws_sqs_queue.matching_items.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.matching_items.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.items.arn }
      }
    }]
  })
}

resource "aws_sqs_queue_policy" "notification_matches_policy" {
  queue_url = aws_sqs_queue.notification_matches.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.notification_matches.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.matches.arn }
      }
    }]
  })
}
