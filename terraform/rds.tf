# RDS PostgreSQL Database
# Managed database service

# DB Subnet Group - untuk multi-AZ deployment
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16.10" # PostgreSQL 15.10-R3 (tersedia di AWS Academy)

  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability
  multi_az = false # Set true untuk production

  # Backup Configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Monitoring - Disable enhanced monitoring untuk AWS Academy
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 0 # Disabled karena pakai LabRole

  # Deletion Protection
  deletion_protection = false # Set true untuk production
  skip_final_snapshot = true  # Set false untuk production

  tags = {
    Name = "${var.project_name}-postgres-db"
  }
}
