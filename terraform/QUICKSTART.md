# Quick Start - Deploy ke AWS Academy

## 🚀 Deploy dalam 5 Menit

### 1. Start AWS Academy Lab

- Login AWS Academy
- Start Lab
- Tunggu status **ready** (hijau)

### 2. Get Credentials

Klik **AWS Details** → **AWS CLI: Show**

Copy dan paste ke terminal:

```powershell
$env:AWS_ACCESS_KEY_ID="ASIA..."
$env:AWS_SECRET_ACCESS_KEY="..."
$env:AWS_SESSION_TOKEN="..."
$env:AWS_DEFAULT_REGION="us-east-1"
```

### 3. Verify

```bash
aws sts get-caller-identity
```

Harus show account: 851725359341

### 4. Setup Variables

```bash
cd terraform

# terraform.tfvars sudah ada, pastikan isi:
# - db_password
# - gemini_api_key
```

### 5. Deploy!

```bash
# Initialize (first time only)
terraform init

# Deploy
terraform apply -auto-approve
```

Tunggu **10-15 menit**.

### 6. Get URL

```bash
terraform output alb_url
```

Copy URL ini untuk akses aplikasi (setelah STEP 3 selesai).

## ✅ Verification

```bash
# Check semua outputs
terraform output

# Check ECS cluster
aws ecs list-clusters

# Check S3 bucket
aws s3 ls

# Check SQS queues
aws sqs list-queues
```

## 🗑️ Cleanup (Setelah Selesai)

```bash
terraform destroy -auto-approve
```

Ini akan hapus semua resources dan save budget AWS Academy.

## 📊 Resources Created

- ✅ VPC & Networking (sudah ada)
- ✅ Security Groups (sudah ada)
- ✅ Load Balancer (sudah ada)
- ✅ ECR Repositories (sudah ada)
- ✅ S3 Bucket (sudah ada)
- ✅ SQS Queues (sudah ada)
- ✅ SNS Topics (sudah ada)
- ✅ Secrets Manager (sudah ada)
- ✅ CloudWatch (sudah ada)
- 🆕 RDS Database (baru)
- 🆕 ECS Services (baru)
- 🆕 Auto Scaling (baru)

Total: **20 new resources**

## 🎯 Status

**STEP 1: ✅ READY**

Terraform configuration sudah disesuaikan untuk AWS Academy Lab (pakai LabRole).

Next: STEP 2 - Modify backend code untuk S3 & SQS integration.
