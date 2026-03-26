# STEP 2: AWS Services Integration

## 🎯 Tujuan

Modify backend code untuk support AWS services (S3 & SQS) sambil tetap support local development (MinIO & RabbitMQ).

## ✅ Yang Sudah Dibuat

### 1. **AWS SDK Dependencies** (`backend/go.mod`)
```go
github.com/aws/aws-sdk-go-v2 v1.32.7
github.com/aws/aws-sdk-go-v2/config v1.28.7
github.com/aws/aws-sdk-go-v2/service/s3 v1.71.1
github.com/aws/aws-sdk-go-v2/service/sqs v1.37.4
```

### 2. **S3 Storage Implementation** (`backend/storage/s3.go`)
- Upload file ke S3
- Download file dari S3
- Delete file dari S3
- Generate presigned URL
- Check file exists

### 3. **SQS Queue Implementation** (`backend/queue/sqs.go`)
- Send message ke SQS
- Receive messages dari SQS (long polling)
- Delete message setelah processing
- Change message visibility
- Get queue attributes

### 4. **Storage Interface** (`backend/storage/storage.go`)
- Abstraction layer untuk support MinIO & S3
- Factory pattern untuk switch storage

### 5. **Queue Interface** (`backend/queue/queue.go`)
- Abstraction layer untuk support RabbitMQ & SQS
- Factory pattern untuk switch queue

### 6. **Updated Config** (`backend/config/config.go`)
- Add AWS configuration
- Add `USE_AWS` flag untuk switch mode
- Support both local & AWS environments

### 7. **Updated Main** (`backend/main.go`)
- Initialize storage based on `USE_AWS` flag
- Initialize queue based on `USE_AWS` flag
- Log current mode (Local/AWS)

### 8. **Updated .env.example**
- Add AWS environment variables
- Document both local & AWS configs

## 🔄 Architecture

### Local Development Mode (`USE_AWS=false`)
```
Backend → MinIO (localhost:9000)
Backend → RabbitMQ (localhost:5672)
```

### AWS Production Mode (`USE_AWS=true`)
```
Backend → S3 (via IAM Role)
Backend → SQS (via IAM Role)
```

## 📝 Next Steps

### 1. Install Dependencies

```bash
cd backend
go mod tidy
go mod download
```

### 2. Update Handlers (Optional)

Handlers sudah pakai interface, jadi tidak perlu update. Tapi kalau mau optimize:

- `backend/handlers/pdf_handler.go` - Update untuk pakai storage interface
- `backend/handlers/job_handler.go` - Update untuk pakai queue interface
- `backend/worker/worker.go` - Update untuk consume dari SQS

### 3. Test Local Mode

```bash
# Set environment
USE_AWS=false

# Run backend
go run main.go
```

### 4. Test AWS Mode

```bash
# Set environment
USE_AWS=true
AWS_REGION=us-east-1
S3_BUCKET=pdf-summarizer-pdf-files-dev
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/pdf-summarizer-pdf-jobs-dev

# Run backend (di ECS akan auto pakai IAM role)
go run main.go
```

## 🐳 Docker Build

Backend Dockerfile tidak perlu diubah, sudah support AWS SDK.

```bash
# Build image
docker build -t pdf-summarizer-backend ./backend

# Test local
docker run -e USE_AWS=false pdf-summarizer-backend

# Test AWS (akan pakai IAM role dari ECS)
docker run -e USE_AWS=true -e AWS_REGION=us-east-1 pdf-summarizer-backend
```

## 🔐 AWS Credentials

### Local Development
```bash
# Option 1: AWS CLI credentials
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
```

### ECS Deployment
- Credentials otomatis dari IAM Role (LabRole)
- Tidak perlu set AWS credentials
- SDK auto detect dari ECS task role

## 🧪 Testing

### Test S3 Upload
```bash
curl -X POST http://localhost:8080/api/pdfs/upload \
  -F "file=@test.pdf"
```

### Test SQS Job
```bash
curl -X POST http://localhost:8080/api/pdfs/{id}/summarize
```

### Check Queue
```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url $SQS_QUEUE_URL \
  --attribute-names All
```

## 📊 Monitoring

### CloudWatch Logs
- Backend logs otomatis ke CloudWatch
- Filter: `/ecs/pdf-summarizer/backend`

### S3 Metrics
- Storage usage
- Request count
- Error rate

### SQS Metrics
- Messages in queue
- Messages in flight
- DLQ messages

## 🎓 Untuk Demo LKS

### Show Code Changes:
1. **Storage abstraction** - Interface pattern
2. **Queue abstraction** - Factory pattern
3. **AWS SDK integration** - S3 & SQS clients
4. **Configuration** - Environment-based switching

### Explain Benefits:
- ✅ Support local development (MinIO/RabbitMQ)
- ✅ Support AWS production (S3/SQS)
- ✅ Easy to switch (single flag)
- ✅ No code duplication
- ✅ Clean architecture

---

**Status: ✅ STEP 2 COMPLETE**

Backend code sudah ready untuk AWS deployment. Tinggal:
1. Install dependencies: `go mod tidy`
2. Build Docker image
3. Push ke ECR (STEP 3)
