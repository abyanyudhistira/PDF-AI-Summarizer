# S3 Bucket untuk PDF Storage
# Ganti MinIO dengan AWS S3

# S3 Bucket untuk PDF files
resource "aws_s3_bucket" "pdf_files" {
  bucket = "${var.project_name}-pdf-files-${var.environment}"

  tags = {
    Name        = "${var.project_name}-pdf-files"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Enable versioning untuk backup
resource "aws_s3_bucket_versioning" "pdf_files" {
  bucket = aws_s3_bucket.pdf_files.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "pdf_files" {
  bucket = aws_s3_bucket.pdf_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "pdf_files" {
  bucket = aws_s3_bucket.pdf_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy - delete old versions after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "pdf_files" {
  bucket = aws_s3_bucket.pdf_files.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# CORS configuration untuk frontend upload
resource "aws_s3_bucket_cors_configuration" "pdf_files" {
  bucket = aws_s3_bucket.pdf_files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"] # Update dengan domain frontend untuk production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
