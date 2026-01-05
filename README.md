# 📄 PDF AI Summarizer

> AI-powered PDF summarization system with intelligent document analysis using Google Gemini AI

[![Golang](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)

## ✨ Features

- 🚀 **Fast PDF Processing** - Upload and process PDFs up to 10MB
- 🤖 **AI-Powered Summarization** - Powered by Google Gemini 2.5 Flash
- 📊 **Multiple Summary Modes**:
  - **Simple**: Quick, easy-to-read summaries
  - **Structured**: Executive summary + key points + highlights
  - **Q&A**: Ask questions about your documents
  - **Multi-Document**: Analyze multiple PDFs together
- 🌍 **Multi-Language Support** - 15+ languages including English, Indonesian, Spanish, French, German
- 📑 **Page Range Selection** - Summarize specific pages (e.g., 1-5, 7, 9)
- 💾 **Summary History** - View and manage past summaries
- ⏱️ **Processing Time Tracking** - Monitor AI processing performance
- 📥 **Export Options** - Copy to clipboard or download as text file

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│ AI Service  │      │  PostgreSQL  │
│  (Next.js)  │◀─────│   (Golang)   │◀─────│  (Python)   │      │  (Database)  │
│  Port 3000  │      │  Port 8080   │      │  Port 8000  │      │  Port 5432   │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
```

**Tech Stack:**
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Golang (Fiber v2), GORM
- **AI Service**: Python (FastAPI), Google Gemini AI
- **Database**: PostgreSQL 16
- **Deployment**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Google Gemini API Key ([Get it here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pdf-ai-summarizer.git
   cd pdf-ai-summarizer
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start all services with Docker**
   ```bash
   docker-compose up --build
   ```
   
   Or use Makefile:
   ```bash
   make up-build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - AI Service: http://localhost:8000
   - API Docs: http://localhost:8080/health

## 📖 Usage

### Web Interface

1. **Upload PDF** - Drag & drop or select PDF file (max 10MB)
2. **View Library** - Browse all uploaded PDFs
3. **Generate Summary**:
   - Select a PDF from library
   - Choose summary mode (Simple/Structured/Q&A)
   - Select language
   - Optionally specify page range
   - Click "Generate Summary"
4. **View History** - Access previous summaries without regenerating
5. **Export** - Copy or download summaries

### API Endpoints

#### PDF Management
```bash
# Upload PDF
POST /api/pdfs/upload

# List all PDFs
GET /api/pdfs

# Get PDF details
GET /api/pdfs/:id

# Delete PDF
DELETE /api/pdfs/:id
```

#### Summarization
```bash
# Generate summary
POST /api/pdfs/:id/summarize
{
  "mode": "simple|structured|qa",
  "language": "indonesian",
  "pages": "1-5",
  "question": "What is the main topic?" // for QA mode
}

# Get summary history
GET /api/pdfs/:id/summaries

# Get all summaries
GET /api/summaries

# Delete summary
DELETE /api/summaries/:id
```

### Example with cURL

```bash
# Upload PDF
curl -X POST http://localhost:8080/api/pdfs/upload \
  -F "file=@document.pdf"

# Generate simple summary
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "simple",
    "language": "indonesian"
  }'

# Generate structured summary with page range
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "structured",
    "language": "english",
    "pages": "1-5"
  }'

# Ask question about PDF
curl -X POST http://localhost:8080/api/pdfs/1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "qa",
    "question": "What is the main conclusion?",
    "language": "english"
  }'
```

## 🐳 Docker Commands

```bash
# Start all services
make up-build

# View logs
make logs

# Check service health
make health

# Stop services
make down

# Clean everything (⚠️ deletes data)
make clean

# Backup database
make backup-db

# Production deployment
make prod-up
```

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker documentation.

**Having issues?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for solutions.

## 💻 Development Setup (Without Docker)

### Backend (Golang)
```bash
cd backend
cp .env.example .env
go mod download
go run main.go
```

### AI Service (Python)
```bash
cd ai-service
cp .env.example .env
pip install -r requirements.txt
python main.py
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
docker-compose up -d db
```

## 📁 Project Structure

```
pdf-ai-summarizer/
├── frontend/                 # Next.js frontend
│   ├── app/
│   │   └── page.js          # Main application
│   ├── Dockerfile
│   └── package.json
├── backend/                  # Golang backend
│   ├── config/              # Configuration
│   ├── database/            # Database connection
│   ├── handlers/            # API handlers
│   ├── models/              # Data models
│   ├── utils/               # Helper functions
│   ├── Dockerfile
│   └── main.go
├── ai-service/              # Python AI service
│   ├── main.py              # FastAPI + Gemini AI
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
├── Makefile                 # Easy commands
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=pdf_summarizer
AI_SERVICE_URL=http://localhost:8000
MAX_FILE_SIZE=10485760  # 10MB
```

**AI Service (.env)**
```env
GEMINI_API_KEY=your_api_key_here
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 📊 Database Schema

### pdf_files
```sql
id              SERIAL PRIMARY KEY
filename        VARCHAR(255)
original_filename VARCHAR(255)
file_path       VARCHAR(500)
file_size       BIGINT
total_pages     INTEGER
upload_date     TIMESTAMP
deleted_at      TIMESTAMP
```

### summaries
```sql
id                SERIAL PRIMARY KEY
pdf_file_id       INTEGER (FK)
mode              VARCHAR(50)
language          VARCHAR(50)
pages_processed   VARCHAR(100)
summary_text      TEXT
executive_summary TEXT
bullets           TEXT
highlights        TEXT
qa_question       TEXT
qa_answer         TEXT
processing_time   FLOAT
created_at        TIMESTAMP
deleted_at        TIMESTAMP
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8080/health
```

### Postman Collection
Import `PDF_AI_Summarizer.postman_collection.json` for complete API testing.

## 🚢 Production Deployment

1. **Update environment variables** for production
2. **Setup SSL certificates** in `ssl/` folder
3. **Configure nginx.conf** with your domain
4. **Deploy with production compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) - AI summarization engine
- [Fiber](https://gofiber.io/) - Fast Golang web framework
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js](https://nextjs.org/) - React framework
- [PostgreSQL](https://www.postgresql.org/) - Reliable database

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/pdf-ai-summarizer](https://github.com/yourusername/pdf-ai-summarizer)

---

⭐ Star this repo if you find it helpful!
