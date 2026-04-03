# Deployment Guide - PDF AI Summarizer

## Overview

This guide covers deploying PDF AI Summarizer to AWS using Terraform with local deployment (compatible with AWS Academy LabRole).

## Architecture

```
Internet → CloudFront (WAF) → ALB → ECS Fargate
                                       ├── Frontend (Next.js)
                                       ├── Backend (Golang)
                                       └── AI Service (Python)
                                              ↓
                                      SQS (Job Queue)
                                              ↓
                                      RDS PostgreSQL
                                              ↓
                                      S3 (PDF Storage)
```

## Prerequisites

### Required Tools
- Terraform >= 1.0
- AWS CLI v2
- Docker

### AWS Academy Setup
1. Get credentials from AWS Academy Details page
2. Configure AWS CLI:
   ```bash
   aws configure
   # Masukkan credentials dari AWS Academy
   ```

## Quick Deployment

### Windows
```batch
deploy.bat
```

### Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment Steps

### 1. Configure AWS Credentials

```bash
# Dari AWS Academy Details, copy credentials
aws configure

# Verify credentials
aws sts get-caller-identity
```

### 2. Setup Terraform Variables

Edit `terraform/terraform.tfvars`:
```hcl
aws_region        = "ap-southeast-1"
environment       = "dev"
project_name      = "pdf-summarizer"
db_instance_class = "db.t3.micro"
db_username       = "admin"
db_password       = "your-secure-password"
gemini_api_key    = "your-gemini-api-key"
```

### 3. Deploy Infrastructure

```bash
cd terraform

# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply -auto-approve tfplan

# Get outputs
terraform output
```

### 4. Build & Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <ecr-url>

# Build Frontend
docker build -t pdf-summarizer-frontend ./frontend
docker tag pdf-summarizer-frontend:latest <ecr-url>/pdf-summarizer-frontend:latest
docker push <ecr-url>/pdf-summarizer-frontend:latest

# Build Backend
docker build -t pdf-summarizer-backend ./backend
docker tag pdf-summarizer-backend:latest <ecr-url>/pdf-summarizer-backend:latest
docker push <ecr-url>/pdf-summarizer-backend:latest

# Build AI Service
docker build -t pdf-summarizer-ai-service ./ai-service
docker tag pdf-summarizer-ai-service:latest <ecr-url>/pdf-summarizer-ai-service:latest
docker push <ecr-url>/pdf-summarizer-ai-service:latest
```

### 5. Update ECS Services

```bash
aws ecs update-service \
  --cluster pdf-summarizer-cluster \
  --service pdf-summarizer-frontend-service \
  --force-new-deployment

aws ecs update-service \
  --cluster pdf-summarizer-cluster \
  --service pdf-summarizer-backend-service \
  --force-new-deployment

aws ecs update-service \
  --cluster pdf-summarizer-cluster \
  --service pdf-summarizer-ai-service \
  --force-new-deployment

# Wait for stable
aws ecs wait services-stable \
  --cluster pdf-summarizer-cluster \
  --services pdf-summarizer-frontend-service,pdf-summarizer-backend-service,pdf-summarizer-ai-service
```

## GitHub Actions (Optional - Butuh IAM User)

Jika punya IAM user dengan access keys, bisa pakai auto-deploy:

1. Buat IAM user dengan access keys
2. Tambah GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `GEMINI_API_KEY`

3. Workflow CI sudah tersedia di `.github/workflows/ci.yml`

## Monitoring

### Check Logs
```bash
aws logs tail /ecs/pdf-summarizer/backend --follow --region ap-southeast-1
```

### Check Services
```bash
aws ecs describe-services \
  --cluster pdf-summarizer-cluster \
  --services pdf-summarizer-backend-service \
  --region ap-southeast-1
```

### Restart Service
```bash
aws ecs update-service \
  --cluster pdf-summarizer-cluster \
  --service pdf-summarizer-backend-service \
  --force-new-deployment \
  --region ap-southeast-1
```

## Troubleshooting

### LabRole Expired
```bash
# Refresh credentials dari AWS Academy
aws configure
# Masukkan credentials baru
```

### ECS Tasks Not Starting
1. Check CloudWatch logs
2. Check task definition
3. Verify ECR images pushed correctly

### Terraform State Locked
```bash
# Unlock state (jika perlu)
terraform force-unlock <lock-id>
```
