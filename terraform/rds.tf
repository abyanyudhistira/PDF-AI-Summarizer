# RDS PostgreSQL Database
# Managed database service

# DB Subnet Group - untuk multi-AZ deployment
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.project_name}-db-subnet-group"
    Project     = var.project_name
    Environment = var.environment
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.10"

  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability - Enable for production
  multi_az = var.environment == "prod" ? true : false

  backup_retention_period = var.environment == "prod" ? 14 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = var.environment == "prod" ? 60 : 0

  # Deletion Protection - Enable for production
  deletion_protection = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment == "prod" ? false : true

  # Performance Insights for production
  performance_insights_enabled          = var.environment == "prod" ? true : false
  performance_insights_retention_period = var.environment == "prod" ? 7 : 0

  tags = {
    Name        = "${var.project_name}-postgres-db"
    Project     = var.project_name
    Environment = var.environment
  }
}

# RDS Event Subscriptions for notifications
resource "aws_db_event_subscription" "main" {
  name      = "${var.project_name}-db-events"
  sns_topic = aws_sns_topic.alerts.arn

  source_type = "db-instance"
  source_ids  = [aws_db_instance.postgres.id]

  event_categories = [
    "failure",
    "maintenance",
    "recovery",
    "configuration change",
  ]

  lifecycle {
    create_before_destroy = true
  }
}
