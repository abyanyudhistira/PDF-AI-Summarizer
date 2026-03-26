# STEP 1: Infrastructure as Code (Terraform)

## 🎯 Tujuan Step Ini

Membuat **Infrastructure as Code** menggunakan Terraform untuk provision semua AWS resources secara otomatis.

## 📁 File yang Dibuat

```
terraform/
├── main.tf              # Provider configuration
├── variables.tf         # Input variables
├── vpc.tf              # Network infrastructure
├── security_groups.tf  # Firewall rules
├── rds.tf              # Database
├── s3.tf               # Object storage
├── sqs.tf              # Message queue
├── sns.tf              # Notifications
├── secrets.tf          # Secrets Manager
├── ecr.tf              # Container registry
├── iam.tf              # Roles & permissions
├── alb.tf              # Load balancer
├── ecs.tf              # Container orchestration
├── autoscaling.tf      # Auto scaling policies
├── cloudwatch.tf       # Monitoring & alarms
├── outputs.tf          # Output values
└── README.md           # Documentation
```

## 🏗️ Arsitektur yang Dibuat

```
Internet
    ↓
Application Load Balancer (Public Subnet)
    ↓
┌─────────────────────────────────────────┐
│         Private Subnet (Multi-AZ)       │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │ Frontend │  │ Backend  │  │  AI   ││
│  │   ECS    │  │   ECS    │  │ ECS   ││
│  └──────────┘  └──────────┘  └───────┘│
│       ↓              ↓           ↓     │
│  ┌──────────────────────────────────┐ │
│  │      RDS PostgreSQL (Multi-AZ)   │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ↓              ↓
    S3 Bucket      SQS Queue
```

## 🔑 Komponen Utama

### 1. **VPC (Virtual Private Cloud)**
- CIDR: 10.0.0.0/16
- 2 Public Subnets (untuk Load Balancer)
- 2 Private Subnets (untuk ECS & Database)
- Internet Gateway & NAT Gateway
- Route Tables

**Kenapa?** Isolasi network untuk security

### 2. **Security Groups**
- ALB Security Group (Allow HTTP/HTTPS dari internet)
- ECS Security Group (Allow traffic dari ALB)
- RDS Security Group (Allow PostgreSQL dari ECS only)

**Kenapa?** Firewall rules untuk protect services

### 3. **RDS PostgreSQL**
- Instance: db.t3.micro (Free tier)
- Storage: 20GB GP3
- Multi-AZ: Disabled (enable untuk production)
- Backup: 7 days retention
- Enhanced Monitoring: Enabled

**Kenapa?** Managed database dengan auto backup & monitoring

### 4. **S3 Bucket**
- Versioning: Enabled
- Encryption: AES256
- Public Access: Blocked
- Lifecycle: Delete old versions after 30 days

**Kenapa?** Ganti MinIO dengan managed object storage

### 5. **SQS Queues**
- Main Queue: pdf-jobs (untuk processing)
- Dead Letter Queue: pdf-jobs-dlq (untuk failed jobs)
- Audit Queue: audit-logs

**Kenapa?** Ganti RabbitMQ dengan managed queue service

### 6. **SNS Topics**
- Alerts Topic (untuk monitoring alerts)
- Job Notifications Topic (untuk job completion)

**Kenapa?** Notification system

### 7. **Secrets Manager**
- Gemini API Key
- Database Credentials

**Kenapa?** Secure storage untuk sensitive data

### 8. **ECR Repositories**
- Frontend repository
- Backend repository
- AI Service repository

**Kenapa?** Store Docker images

### 9. **IAM Roles**
- ECS Task Execution Role (pull images, get secrets)
- ECS Task Role (access S3, SQS, SNS)
- Auto Scaling Role
- RDS Monitoring Role

**Kenapa?** Least privilege access control

### 10. **Application Load Balancer**
- Public-facing
- Route /api/* → Backend
- Route /* → Frontend
- Health checks enabled

**Kenapa?** Distribute traffic & high availability

### 11. **ECS Cluster & Services**
- Fargate launch type (serverless containers)
- Frontend Service (1-4 tasks)
- Backend Service (1-4 tasks)
- AI Service (1-3 tasks)
- Service Discovery untuk internal communication

**Kenapa?** Container orchestration

### 12. **Auto Scaling**
- Scale based on CPU (70% threshold)
- Scale based on Memory (80% threshold)
- Scale based on SQS queue depth (10 messages)

**Kenapa?** Otomatis handle load spikes

### 13. **CloudWatch**
- Dashboard untuk monitoring
- Alarms untuk high CPU/Memory
- Alarms untuk unhealthy targets
- Alarms untuk 5xx errors
- Log Groups untuk semua services

**Kenapa?** Monitoring & alerting

## 🎬 Cara Deploy

### 1. Install Prerequisites

```bash
# Install Terraform
choco install terraform

# Install AWS CLI
choco install awscli

# Verify installation
terraform version
aws --version
```

### 2. Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: ap-southeast-1
# Default output format: json
```

### 3. Setup Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars:
# - Isi db_password
# - Isi gemini_api_key
```

### 4. Initialize Terraform

```bash
terraform init
```

Output:
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.x.x...

Terraform has been successfully initialized!
```

### 5. Validate Configuration

```bash
terraform validate
```

### 6. Preview Changes

```bash
terraform plan
```

Ini akan show:
- 50+ resources yang akan dibuat
- Estimasi perubahan
- Tidak ada yang di-create sampai kamu run apply

### 7. Deploy Infrastructure

```bash
terraform apply
```

Ketik `yes` untuk confirm.

**Tunggu 10-15 menit** untuk provision semua resources.

### 8. Check Outputs

```bash
terraform output
```

Output penting:
```
alb_url = "http://pdf-summarizer-alb-xxxxx.ap-southeast-1.elb.amazonaws.com"
ecr_frontend_url = "xxxxx.dkr.ecr.ap-southeast-1.amazonaws.com/pdf-summarizer-frontend"
ecr_backend_url = "xxxxx.dkr.ecr.ap-southeast-1.amazonaws.com/pdf-summarizer-backend"
ecr_ai_service_url = "xxxxx.dkr.ecr.ap-southeast-1.amazonaws.com/pdf-summarizer-ai-service"
s3_bucket_name = "pdf-summarizer-pdf-files-dev"
sqs_queue_url = "https://sqs.ap-southeast-1.amazonaws.com/xxxxx/pdf-summarizer-pdf-jobs-dev"
```

## ✅ Verifikasi

### 1. Check AWS Console

Buka AWS Console dan verify:

**VPC:**
- https://console.aws.amazon.com/vpc/
- Lihat VPC, Subnets, Route Tables

**ECS:**
- https://console.aws.amazon.com/ecs/
- Lihat Cluster, Services (masih 0 tasks karena belum ada images)

**RDS:**
- https://console.aws.amazon.com/rds/
- Lihat Database instance (status: available)

**S3:**
- https://console.aws.amazon.com/s3/
- Lihat bucket pdf-files

**ECR:**
- https://console.aws.amazon.com/ecr/
- Lihat 3 repositories (masih kosong)

**Load Balancer:**
- https://console.aws.amazon.com/ec2/v2/home#LoadBalancers
- Lihat ALB (status: active)

**CloudWatch:**
- https://console.aws.amazon.com/cloudwatch/
- Lihat Dashboard & Alarms

### 2. Test Database Connection

```bash
# Get RDS endpoint
terraform output rds_endpoint

# Test connection (dari local, perlu security group adjustment)
# Atau tunggu sampai backend deployed
```

## 🔧 Troubleshooting

### Error: "InvalidParameterException: Security token"
```bash
# AWS credentials tidak valid atau expired
aws configure
# Masukkan credentials yang benar
```

### Error: "Error creating DB Instance: DBInstanceAlreadyExists"
```bash
# Database dengan nama yang sama sudah ada
# Ganti db_name di variables atau destroy existing DB
```

### Error: "Error creating S3 bucket: BucketAlreadyExists"
```bash
# Bucket name harus unique globally
# Edit s3.tf dan ganti bucket name
```

## 📊 Monitoring

### CloudWatch Dashboard

```bash
# Get dashboard URL
terraform output cloudwatch_dashboard_url
```

Dashboard menampilkan:
- ECS CPU & Memory usage
- Load Balancer response time & request count
- SQS queue depth
- RDS CPU & connections

### CloudWatch Alarms

Alarms akan trigger SNS notification ketika:
- Backend CPU > 85%
- AI Service Memory > 90%
- RDS CPU > 80%
- Ada unhealthy targets di ALB
- Terlalu banyak 5xx errors

## 🎓 Untuk Demo LKS

### Poin-poin yang Bisa Dijelaskan:

1. **Infrastructure as Code**
   - Show file terraform/*.tf
   - Jelaskan setiap resource
   - Version control untuk infrastructure

2. **Network Architecture**
   - VPC isolation
   - Public vs Private subnets
   - NAT Gateway untuk outbound traffic

3. **Security**
   - Security Groups (firewall)
   - IAM Roles (least privilege)
   - Secrets Manager (no hardcoded secrets)

4. **High Availability**
   - Multi-AZ subnets
   - Load Balancer distribute traffic
   - Auto Scaling handle failures

5. **Monitoring**
   - CloudWatch Dashboard
   - Alarms & Notifications
   - Log aggregation

6. **Automation**
   - Single command deployment
   - Reproducible infrastructure
   - Easy disaster recovery

## 🚀 Next Steps

Setelah infrastructure ready, lanjut ke:
- **STEP 2**: Modify Backend Code (S3 & SQS integration)
- **STEP 3**: Build & Push Docker Images ke ECR
- **STEP 4**: Setup CI/CD dengan GitHub Actions
- **STEP 5**: Deploy Application ke ECS

---

**Status: ✅ STEP 1 COMPLETE**

Infrastructure code sudah ready. Tinggal run `terraform apply` untuk deploy!
