# Terraform Infrastructure - PDF Summarizer

Infrastructure as Code untuk deploy PDF Summarizer ke AWS menggunakan Terraform.

## 📋 Prerequisites

1. **Install Terraform**
   ```bash
   # Download dari: https://www.terraform.io/downloads
   # Atau pakai chocolatey (Windows):
   choco install terraform
   ```

2. **Install AWS CLI**
   ```bash
   # Download dari: https://aws.amazon.com/cli/
   # Atau pakai chocolatey:
   choco install awscli
   ```

3. **Configure AWS Credentials**
   ```bash
   aws configure
   # Masukkan:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region: ap-southeast-1
   # - Default output format: json
   ```

## 🚀 Cara Pakai

### 1. Setup Variables

```bash
# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars dan isi:
# - db_password (password database)
# - gemini_api_key (API key dari Google AI Studio)
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

Ini akan download AWS provider dan setup backend.

### 3. Preview Changes

```bash
terraform plan
```

Ini akan show semua resources yang akan dibuat (tanpa create).

### 4. Deploy Infrastructure

```bash
terraform apply
```

Ketik `yes` untuk confirm. Proses ini akan:
- Buat VPC, Subnets, Security Groups
- Provision RDS PostgreSQL
- Buat S3 bucket
- Setup SQS queues
- Buat ECR repositories
- Setup ECS cluster
- Configure Load Balancer
- Setup Auto Scaling
- Configure CloudWatch monitoring

**Estimasi waktu: 10-15 menit**

### 5. Get Outputs

```bash
terraform output
```

Ini akan show informasi penting seperti:
- Load Balancer URL
- ECR repository URLs
- Database endpoint
- S3 bucket name
- SQS queue URLs

## 📦 Resources yang Dibuat

### Networking
- 1 VPC
- 2 Public Subnets (untuk Load Balancer)
- 2 Private Subnets (untuk ECS & RDS)
- 1 Internet Gateway
- 1 NAT Gateway
- Route Tables

### Compute
- 1 ECS Cluster
- 3 ECS Services (Frontend, Backend, AI Service)
- 3 ECS Task Definitions
- 1 Application Load Balancer
- 3 Target Groups
- Auto Scaling Policies

### Storage
- 1 S3 Bucket (dengan versioning & encryption)
- 1 RDS PostgreSQL Instance

### Application Integration
- 2 SQS Queues (Main + DLQ)
- 2 SNS Topics (Alerts + Notifications)

### Security
- 3 Security Groups (ALB, ECS, RDS)
- 3 IAM Roles (Task Execution, Task, Auto Scaling)
- 2 Secrets Manager Secrets

### Monitoring
- 1 CloudWatch Dashboard
- 5 CloudWatch Alarms
- 3 CloudWatch Log Groups

## 🔄 Update Infrastructure

Setelah edit file .tf:

```bash
terraform plan   # Preview changes
terraform apply  # Apply changes
```

## 🗑️ Destroy Infrastructure

**HATI-HATI!** Ini akan hapus semua resources:

```bash
terraform destroy
```

## 💰 Estimasi Biaya

Dengan konfigurasi default (Free Tier):
- **ECS Fargate**: ~$15-30/bulan
- **RDS db.t3.micro**: Free tier (750 jam/bulan)
- **NAT Gateway**: ~$32/bulan (paling mahal!)
- **Load Balancer**: ~$16/bulan
- **S3**: ~$0.50/bulan (untuk 10GB)
- **SQS**: Free tier (1 juta requests/bulan)

**Total: ~$65-80/bulan** (tanpa free tier)

### Tips Hemat untuk Latihan:
1. Destroy infrastructure setelah selesai latihan
2. Pakai `multi_az = false` untuk RDS
3. Set `desired_count = 1` untuk semua services
4. Matikan NAT Gateway kalau tidak perlu internet access dari private subnet

## 📊 Monitoring

Akses CloudWatch Dashboard:
```bash
terraform output cloudwatch_dashboard_url
```

Atau buka AWS Console → CloudWatch → Dashboards

## 🔐 Security Best Practices

✅ Database di private subnet
✅ Encryption at rest (S3 & RDS)
✅ IAM roles dengan least privilege
✅ Secrets di Secrets Manager
✅ Security Groups restrictive
✅ VPC isolation

## 🎯 Untuk Demo LKS

1. **Show Infrastructure Code** - Jelaskan setiap file .tf
2. **Run terraform plan** - Show preview
3. **Run terraform apply** - Deploy infrastructure
4. **Show AWS Console** - Lihat resources yang dibuat
5. **Show Outputs** - URLs dan endpoints
6. **Show CloudWatch** - Monitoring dashboard
7. **Simulate Load** - Trigger auto scaling
8. **Run terraform destroy** - Cleanup

## 📝 Next Steps

Setelah infrastructure ready:
1. Build & push Docker images ke ECR
2. Update ECS services dengan images baru
3. Setup CI/CD dengan GitHub Actions
4. Configure domain & SSL certificate

Lihat file `../docs/DEPLOYMENT.md` untuk panduan lengkap.
