# PDF AI Summarizer

AI-powered PDF summarization system with Golang backend, Python AI service, and Next.js frontend.

## 🚀 Stack
- **Backend**: Golang (Fiber v2 + GORM)
- **AI Service**: Python (FastAPI + Google Gemini 2.5)
- **Database**: PostgreSQL 16
- **Frontend**: Next.js 14

## 🐳 Quick Start with Docker (Recommended)

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_api_key_here
```

### 2. Run All Services

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8000
- **Database**: localhost:5432

### 4. Stop Services

```bash
docker-compose down
```

📖 **Full Docker documentation**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 💻 Manual Setup (Development)

### Prerequisites
- Go 1.21+
- Python 3.11+
- Node.js 20+
- PostgreSQL 16

### 1. Database

```bash
docker-compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your settings
go mod download
go run main.go
```

### 3. AI Service

```bash
cd ai-service
cp .env.example .env
# Add GEMINI_API_KEY to .env
pip install -r requirements.txt
python main.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Endpoints

### Backend (Port 8080)

**PDF Management:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/pdfs/upload` | Upload PDF |
| GET | `/api/pdfs` | List PDFs |
| GET | `/api/pdfs/:id` | Get PDF detail |
| DELETE | `/api/pdfs/:id` | Delete PDF |
| GET | `/api/pdfs/stats/count` | Get statistics |

**Summarization:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdfs/:id/summarize` | Trigger summarization |
| GET | `/api/pdfs/:id/summaries` | List summaries for PDF |
| GET | `/api/summaries` | List all summaries |
| GET | `/api/summaries/:id` | Get summary detail |
| DELETE | `/api/summaries/:id` | Delete summary |

### AI Service (Port 8000)
| Endpoint | Body |
|----------|------|
| POST `/summarize` | files, language, pages |
| POST `/summarize-structured` | files, language, pages |
| POST `/summarize-multi` | files, language |
| POST `/qa` | question, files, language |

## Testing

```bash
# Health
curl http://localhost:8080/health

# Upload PDF
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@test.pdf"

# List PDFs
curl http://localhost:8080/api/pdfs

# Summarize (Simple)
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{"mode":"simple","language":"Indonesian"}'

# Summarize (Structured)
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{"mode":"structured","language":"Indonesian","pages":"1-5"}'

# Summarize (QA)
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{"mode":"qa","question":"Apa topik utama?","language":"Indonesian"}'

# List Summaries
curl http://localhost:8080/api/pdfs/1/summaries

# Stats
curl http://localhost:8080/api/pdfs/stats/count
```
## Database

```bash
# Connect
docker exec -it postgres_db psql -U admin -d pdf_summarizer

# Query
SELECT * FROM pdf_files;
SELECT * FROM summaries;
```

## Features
- ✅ PDF upload (max 10MB)
- ✅ CRUD operations
- ✅ **Go ↔ Python integration via HTTP**
- ✅ **AI summarization with result storage**
- ✅ **Processing time tracking**
- ✅ Simple, structured, multi-PDF summarization
- ✅ Q&A on PDF content
- ✅ Multi-language support (15+ languages)
- ✅ Page range selection
- ✅ Soft delete & cascade delete

## Structure

```
pdf-ai-summarizer/
├── backend/           # Fiber + GORM
├── ai-service/        # FastAPI + Gemini
├── frontend/          # Next.js
└── docker-compose.yml # PostgreSQL
```
