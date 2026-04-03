# SQS Queue untuk Job Processing
# Ganti RabbitMQ dengan AWS SQS

# Main Queue untuk PDF processing jobs
resource "aws_sqs_queue" "pdf_jobs" {
  name                       = "${var.project_name}-pdf-jobs-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 10
  visibility_timeout_seconds = 900

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.pdf_jobs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.project_name}-pdf-jobs-queue"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Dead Letter Queue - untuk failed jobs
resource "aws_sqs_queue" "pdf_jobs_dlq" {
  name                      = "${var.project_name}-pdf-jobs-dlq-${var.environment}"
  message_retention_seconds = 1209600

  tags = {
    Name        = "${var.project_name}-pdf-jobs-dlq"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Queue untuk Audit logs (optional)
resource "aws_sqs_queue" "audit_logs" {
  name                       = "${var.project_name}-audit-logs-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 10
  visibility_timeout_seconds = 60

  tags = {
    Name        = "${var.project_name}-audit-logs-queue"
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Alarms untuk monitoring queue
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  alarm_name          = "${var.project_name}-sqs-dlq-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "Alert ketika ada messages di DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.pdf_jobs_dlq.name
  }
}
