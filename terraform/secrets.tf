# AWS Secrets Manager
# Simpan sensitive data seperti API keys dan passwords

# Secret untuk Gemini API Key
resource "aws_secretsmanager_secret" "gemini_api_key" {
  name        = "${var.project_name}/gemini-api-key"
  description = "Google Gemini API Key untuk AI Service"

  tags = {
    Name        = "${var.project_name}-gemini-api-key"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "gemini_api_key" {
  secret_id     = aws_secretsmanager_secret.gemini_api_key.id
  secret_string = var.gemini_api_key
}

# Secret untuk Database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}/db-credentials"
  description = "Database credentials untuk RDS"

  tags = {
    Name        = "${var.project_name}-db-credentials"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = var.db_name
  })
}
