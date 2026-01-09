# 📄 PDF AI Summarizer

> AI-powered PDF summarization with Google Gemini AI, checkpoint/resume system, and smart chunking

[![Golang](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=flat&logo=rabbitmq)](https://www.rabbitmq.com/)
[![MinIO](https://img.shields.io/badge/MinIO-S3-C72E49?style=flat&logo=minio)](https://min.io/)

## ✨ Key Features

- **3 Summary Modes** - Simple, Structured, Q&A
- **5 Languages** - 🇮🇩 Indonesian, 🇬🇧 English, 🇪🇸 Spanish, 🇫🇷 French, 🇩🇪 German
- **Checkpoint/Resume** - Resume failed jobs, save up to 60% cost
- **Smart Chunking** - Handle large documents (10k words/chunk)
- **Advanced Filters** - Search, sort, filter by mode/language/date
- **Export Options** - Copy, TXT, JSON, CSV
- **MinIO Storage** - S3-compatible object storage
- **Job Queue** - RabbitMQ with auto-retry (3x)

## 🏗️ Architecture

```
Frontend (Next.js) → Backend (Golang) → RabbitMQ → Worker
                          ↓                          ↓
                    PostgreSQL              AI Service (Python + Gemini)
                          ↓
                    MinIO (S3)
```

**Stack:** Next.js 16 • Golang Fiber • Python FastAPI • PostgreSQL • RabbitMQ • MinIO

## 🚀 Quick Start

```bash
# 1. Clone & setup
git clone <repo-url>
cd pdf-ai-summarizer
cp .env.example .env
# Edit .env: Add GEMINI_API_KEY

# 2. Start with Docker
docker-compose up --build

# 3. Access
# Frontend:      http://localhost:3000
# Backend API:   http://localhost:8080
# RabbitMQ UI:   http://localhost:15672
# MinIO Console: http://localhost:9001
```

## 📖 API Examples

### Create Summary Job
```bash
POST /api/pdfs/:id/summarize
{
  "mode": "simple|structured|qa",
  "language": "indonesian",
  "pages": "1-5,7",  // optional
  "question": "..."  // for QA mode
}
```

### Check Job Status
```bash
GET /api/jobs/:jobId
```

### Retry Failed Job (Resume from Checkpoint)
```bash
POST /api/jobs/:jobId/retry
```

## 🔄 Checkpoint System

**How it works:**
1. Job processes PDF page by page
2. Progress saved after each page/chunk
3. On failure: Job can resume from last checkpoint
4. **Benefit:** Save up to 60% on AI costs for failed jobs

**Permanent errors (no retry):**
- File not found, corrupted PDF, invalid format, encrypted PDF

## 🧩 Chunking System

For large documents (>100k chars):
- **Chunk size:** 10,000 words (reduced API calls by 60%)
- **Overlap:** 500 words (context continuity)
- **Process:** Summarize each chunk → Combine results

## �  Project Structure

```
pdf-ai-summarizer/
├── frontend/          # Next.js 16
│   ├── app/page.js   # Main UI
│   ├── lib/          # API, utils, filters, constants
│   └── components/   # Reusable components
├── backend/          # Golang Fiber
│   ├── handlers/     # API endpoints
│   ├── models/       # Database models
│   ├── queue/        # RabbitMQ
│   ├── worker/       # Job consumer
│   └── storage/      # MinIO client
├── ai-service/       # Python + Gemini AI
└── docker-compose.yml
```

## 📚 Documentation

- [Refactoring Guide](frontend/REFACTORING_GUIDE.md) - Frontend refactoring details
- [Chunking Implementation](CHUNKING_IMPLEMENTATION.md) - Chunking system
- [Header Feature](HEADER_FEATURE.md) - Search & filter
- [Notification System](NOTIFICATION_SYSTEM.md) - Notifications

## 🚢 Production

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Set production environment variables in `.env`:
- `GEMINI_API_KEY` - Your Gemini API key
- `DATABASE_URL` - PostgreSQL connection
- `RABBITMQ_URL` - RabbitMQ connection
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` - MinIO config

