# Setup untuk AWS Academy Lab

## 🎓 Perbedaan AWS Academy vs AWS Regular

AWS Academy Lab punya beberapa limitasi:
- ❌ Tidak bisa create IAM roles/users baru
- ✅ Sudah ada **LabRole** dengan permissions lengkap
- ⏰ Lab session expired setelah 4 jam
- 💰 Budget terbatas per lab session

## ✅ Modifikasi yang Sudah Dilakukan

### 1. IAM Configuration (iam.tf)

**SEBELUM:**
```hcl
# Create custom IAM roles
resource "aws_iam_role" "ecs_task_execution" { ... }
resource "aws_iam_role" "ecs_task" { ... }
resource "aws_iam_role" "ecs_autoscale" { ... }
resource "aws_iam_role" "rds_monitoring" { ... }
```

**SESUDAH:**
```hcl
# Pakai LabRole yang sudah ada
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
```

### 2. ECS Task Definitions (ecs.tf)

**SEBELUM:**
```hcl
execution_role_arn = aws_iam_role.ecs_task_execution.arn
task_role_arn      = aws_iam_role.ecs_task.arn
```

**SESUDAH:**
```hcl
execution_role_arn = data.aws_iam_role.lab_role.arn
task_role_arn      = data.aws_iam_role.lab_role.arn
```

### 3. RDS Monitoring (rds.tf)

**SEBELUM:**
```hcl
monitoring_interval = 60
monitoring_role_arn = aws_iam_role.rds_monitoring.arn
```

**SESUDAH:**
```hcl
monitoring_interval = 0  # Disabled
# Tidak perlu monitoring role
```

### 4. Auto Scaling (autoscaling.tf)

**SEBELUM:**
```hcl
role_arn = aws_iam_role.ecs_autoscale.arn
```

**SESUDAH:**
```hcl
# role_arn tidak perlu di-specify
# AWS akan pakai service-linked role otomatis
```

## 🚀 Cara Deploy di AWS Academy

### 1. Start Lab Session

1. Login ke AWS Academy
2. Klik **Start Lab**
3. Tunggu sampai status **ready** (hijau)
4. Klik **AWS** untuk buka console

### 2. Get AWS Credentials

Di AWS Academy, klik **AWS Details** → **AWS CLI**

Copy credentials:
```bash
[default]
aws_access_key_id=ASIA...
aws_secret_access_key=...
aws_session_token=...
```

### 3. Configure AWS CLI

**Option A: Environment Variables (Recommended)**
```bash
# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="ASIA..."
$env:AWS_SECRET_ACCESS_KEY="..."
$env:AWS_SESSION_TOKEN="..."
$env:AWS_DEFAULT_REGION="us-east-1"
```

**Option B: AWS Configure**
```bash
aws configure set aws_access_key_id ASIA...
aws configure set aws_secret_access_key ...
aws configure set aws_session_token ...
aws configure set region us-east-1
```

### 4. Verify Credentials

```bash
aws sts get-caller-identity
```

Output harus show:
```json
{
    "UserId": "AROA....:user...",
    "Account": "851725359341",
    "Arn": "arn:aws:sts::851725359341:assumed-role/voclabs/user..."
}
```

### 5. Deploy Infrastructure

```bash
cd terraform

# Initialize
terraform init

# Validate
terraform validate

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

**Tunggu 10-15 menit** untuk provision semua resources.

### 6. Get Outputs

```bash
terraform output
```

Save output ini untuk STEP 2!

## ⚠️ Penting untuk AWS Academy

### Time Management

Lab session **4 jam**, breakdown:
- Infrastructure deployment: 15 menit
- Build & push images: 20 menit
- Testing: 30 menit
- Demo preparation: 1 jam
- **Buffer: 2 jam** (untuk troubleshooting)

### Cost Management

AWS Academy punya budget limit. Untuk hemat:

1. **Destroy setelah selesai:**
   ```bash
   terraform destroy
   ```

2. **Pakai minimal resources:**
   - RDS: db.t3.micro (free tier)
   - ECS: 1 task per service
   - Disable multi-AZ

3. **Stop lab session** ketika tidak pakai

### Troubleshooting

**Error: "User is not authorized to perform: iam:CreateRole"**
- ✅ Sudah fixed! Sekarang pakai LabRole

**Error: "Session token expired"**
- Lab session expired, start lab baru
- Update credentials dari AWS Details

**Error: "Service limit exceeded"**
- AWS Academy punya limit per service
- Destroy resources yang tidak perlu

## 📊 Resources yang Akan Dibuat

Total: **20 resources baru** (sisanya sudah ada)

1. RDS PostgreSQL Instance
2. DB Subnet Group
3. Service Discovery Namespace
4. Service Discovery Service
5. 3 ECS Task Definitions
6. 3 ECS Services
7. 2 Auto Scaling Targets
8. 5 Auto Scaling Policies
9. 3 CloudWatch Alarms
10. 1 Secrets Manager Secret Version

## ✅ Checklist Sebelum Deploy

- [ ] Lab session active (status hijau)
- [ ] AWS credentials configured
- [ ] terraform.tfvars sudah diisi (db_password, gemini_api_key)
- [ ] terraform init berhasil
- [ ] terraform validate berhasil
- [ ] terraform plan berhasil (20 resources to add)

## 🎯 Next Steps

Setelah infrastructure deployed:
1. **STEP 2**: Modify backend code untuk S3 & SQS
2. **STEP 3**: Build & push Docker images ke ECR
3. **STEP 4**: Update ECS services
4. **STEP 5**: Testing & monitoring

---

**Status: ✅ READY untuk AWS Academy Lab**

Semua IAM issues sudah resolved. Tinggal deploy!
