# SNS Topic untuk Notifications
# Alert ketika ada masalah atau job selesai

# SNS Topic untuk alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"

  tags = {
    Name = "${var.project_name}-alerts-topic"
  }
}

# SNS Topic untuk job completion notifications
resource "aws_sns_topic" "job_notifications" {
  name = "${var.project_name}-job-notifications-${var.environment}"

  tags = {
    Name = "${var.project_name}-job-notifications-topic"
  }
}

# Email subscription untuk alerts (optional - configure manual)
# Uncomment dan isi email untuk auto subscribe
# resource "aws_sns_topic_subscription" "alerts_email" {
#   topic_arn = aws_sns_topic.alerts.arn
#   protocol  = "email"
#   endpoint  = "your-email@example.com"
# }
