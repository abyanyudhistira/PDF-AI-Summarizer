# Terraform Outputs
# Informasi penting setelah deployment

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Load Balancer DNS Name"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "Load Balancer URL untuk akses aplikasi"
  value       = "http://${aws_lb.main.dns_name}"
}

output "application_url" {
  description = "URL untuk akses aplikasi"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_frontend_url" {
  description = "ECR Repository URL - Frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_url" {
  description = "ECR Repository URL - Backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_ai_service_url" {
  description = "ECR Repository URL - AI Service"
  value       = aws_ecr_repository.ai_service.repository_url
}

output "rds_endpoint" {
  description = "RDS Database Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_multi_az" {
  description = "Multi-AZ enabled"
  value       = aws_db_instance.postgres.multi_az
}

output "s3_bucket_name" {
  description = "S3 Bucket Name untuk PDF files"
  value       = aws_s3_bucket.pdf_files.id
}

output "sqs_queue_url" {
  description = "SQS Queue URL untuk PDF jobs"
  value       = aws_sqs_queue.pdf_jobs.url
}

output "sqs_dlq_url" {
  description = "SQS Dead Letter Queue URL"
  value       = aws_sqs_queue.pdf_jobs_dlq.url
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_url" {
  description = "ECS Console URL"
  value       = "https://console.aws.amazon.com/ecs/home?region=${var.aws_region}#/clusters/${aws_ecs_cluster.main.name}"
}

output "sns_topic_arn" {
  description = "SNS Topic ARN untuk notifications"
  value       = aws_sns_topic.alerts.arn
}

output "waf_web_acl_id" {
  description = "WAF Web ACL ID (empty for dev)"
  value       = var.environment == "prod" ? aws_wafv2_web_acl.main[0].id : ""
}
