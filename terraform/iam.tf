# IAM Configuration untuk AWS Academy Lab
# Menggunakan LabRole yang sudah ada

# Data source untuk LabRole yang sudah ada
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# Note: Di AWS Academy Lab, kita tidak bisa create IAM roles baru
# Semua services akan menggunakan LabRole yang sudah ada
# LabRole sudah punya permissions untuk:
# - ECS Task Execution
# - S3 Access
# - SQS Access
# - SNS Publish
# - Secrets Manager Access
# - CloudWatch Logs
# - Auto Scaling
