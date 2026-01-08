# 📄 PDF AI Summarizer

> AI-powered PDF summarization with Google Gemini AI, job queue system, and audit logging

[![Golang](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=flat&logo=rabbitmq)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)

## ✨ Features

- **AI Summarization** - Google Gemini 2.5 Flash with temperature 0.3 for accuracy
- **4 Stummary Modes** - Simple, Structured, Q&A
- **Multi-Language** - 15+ languages (English, Indonesian, Spanish, French, German, etc.)
- **Page Slelection** - Summarize specific pages (e.g., 1-5, 7, 9)
- **Job Queue System** - RabbitMQ with auto-retry (max 3x) and Dead Letter Queue
- **Audit Logging** - Track all API requests with async processing
- **Summary History** - View past summaries with PostgreSQL trigger auto-update
- **Export** - Copy or download summaries

## 🏗️ Architecture

```
┌──────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │───▶│ Backend │───▶│ RabbitMQ │───▶│  Worker  │
│ Next.js  │◀───│ Golang  │◀───│  Queue   │    │ Consumer │
└──────────┘    └────┬────┘    └──────────┘    └────┬─────┘
                     │                               │
                     ▼                               ▼
              ┌─────────────┐              ┌──────────────┐
              │ PostgreSQL  │              │ AI Service   │
              │  Database   │              │ Python+Gemini│
              └─────────────┘              └──────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   MinIO     │
              │   Storage   │
              └─────────────┘
```

**Stack:** Next.js 14 • Golang Fiber v2 • Python FastAPI • PostgreSQL 16 • RabbitMQ 3.13 • MinIO

## � tQuick Start

**Prerequisites:** Docker, Docker Compose, [Gemini API Key](https://makersuite.google.com/app/apikey)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/pdf-ai-summarizer.git
cd pdf-ai-summarizer

# 2. Setup environment
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key_here

# 3. Start services
docker-compose up --build

# 4. Access
# Frontend:        http://localhost:3000
# Backend API:     http://localhost:8080
# RabbitMQ UI:     http://localhost:15672 (admin/admin123)
# MinIO Console:   http://localhost:9001 (admin/admin123)
```

## 📖 API Usage

### PDF Summarization (Asynchronous with Queue)
```bash
# Create summarization job (returns immediately)
POST /api/pdfs/:id/summarize
{
  "mode": "simple|structured|multi|qa",
  "language": "english",
  "pages": "1-5",
  "question": "What is the main topic?" // for QA mode
}

# Response: Job created
{
  "success": true,
  "data": {
    "id": 123,
    "status": "pending",
    "mode": "simple",
    "created_at": "2026-01-07T10:00:00Z"
  }
}

# Check job status (poll every 2 seconds)
GET /api/jobs/:jobId

# List all jobs (with filters)
GET /api/jobs?status=pending&pdf_id=1

# Retry failed job
POST /api/jobs/:jobId/retry
```

### Audit Logging
```bash
# View audit logs
GET /api/audit/logs?action=upload&status=success&page=1&limit=20

# Get statistics
GET /api/audit/stats

# Cleanup old logs
DELETE /api/audit/logs/cleanup?days=30
```

## 🔄 Job Queue System

**How It Works:**
1. User creates job → Job saved to DB (status: pending)
2. Job published to RabbitMQ queue
3. Worker consumes job → Processes with AI service
4. **On Error:** Auto-retry up to 3 times with 5s delay
5. **After 3 Failures:** Job moved to Dead Letter Queue (DLQ)
6. **Manual Recovery:** User can retry failed jobs via API

**Benefits:**
- ✅ Resilient to temporary errors (network, rate limits)
- ✅ Non-blocking (user doesn't wait for long processing)
- ✅ Scalable (add more workers for high load)
- ✅ Traceable (all jobs logged in database)

## 📊 Database Schema

**4 Tables:**
- `pdf_files` - PDF metadata + latest summary (auto-updated via trigger)
- `summary_logs` - Complete history of all summarizations
- `summarization_jobs` - Job queue tracking (status, retries, errors)
- `audit_logs` - API request logging (async via RabbitMQ)

## 📁 Project Structure

```
pdf-ai-summarizer/
├── frontend/           # Next.js 14 + TailwindCSS
├── backend/            # Golang Fiber v2 + GORM
│   ├── handlers/       # API endpoints
│   ├── models/         # Database models
│   ├── queue/          # RabbitMQ setup
│   ├── worker/         # Job consumer
│   └── middleware/     # Audit logging
├── ai-service/         # Python FastAPI + Gemini AI
├── docker-compose.yml  # All services
└── .env                # Configuration (gitignored)
```

## 🚢 Production

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Configure SSL in `nginx.conf` and update environment variables for production.

---
