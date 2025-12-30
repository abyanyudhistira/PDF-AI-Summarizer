# PDF Summarizer - Golang Backend

Backend API untuk PDF Summarizer menggunakan Golang, Gin Framework, dan GORM.

## Tech Stack

- **Golang** 1.21+
- **Gin** - Web framework
- **GORM** - ORM untuk database
- **PostgreSQL** - Database
- **UUID** - Generate unique filenames

## Project Structure

```
backend-go/
├── config/          # Configuration management
├── database/        # Database connection & migration
├── handlers/        # HTTP request handlers
├── models/          # Database models
├── utils/           # Utility functions
├── uploads/         # Uploaded PDF files
├── main.go          # Entry point
├── go.mod           # Go dependencies
└── .env             # Environment variables
```

## Setup

### 1. Install Dependencies

```bash
cd backend-go
go mod download
```

### 2. Configure Environment

Copy `.env` file and adjust if needed:

```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=pdf_summarizer
AI_SERVICE_URL=http://localhost:8000
MAX_FILE_SIZE=10485760
```

### 3. Run Database (Docker)

Make sure PostgreSQL is running:

```bash
docker-compose up -d
```

### 4. Run Server

```bash
go run main.go
```

Server will start on `http://localhost:8080`

## API Endpoints

### Health Check
```
GET /health
```

### PDF Management

#### Upload PDF
```
POST /api/pdfs/upload
Content-Type: multipart/form-data

Body:
- file: PDF file (max 10MB)
```

#### List PDFs
```
GET /api/pdfs?page=1&limit=100
```

#### Get PDF Details
```
GET /api/pdfs/:id
```

#### Delete PDF
```
DELETE /api/pdfs/:id
```

#### Get Statistics
```
GET /api/pdfs/stats/count
```

## Features

- ✅ File upload with validation (type & size)
- ✅ Unique filename generation (timestamp + UUID)
- ✅ Database integration with GORM
- ✅ CRUD operations for PDF files
- ✅ Cascade delete (delete PDF will delete all summaries)
- ✅ CORS enabled
- ✅ Auto migration
- ✅ Error handling
- ✅ Response standardization

## Development

### Build
```bash
go build -o pdf-summarizer-backend
```

### Run Binary
```bash
./pdf-summarizer-backend
```

### Hot Reload (with Air)
```bash
go install github.com/cosmtrek/air@latest
air
```

## Next Steps

- [ ] Add summary endpoints
- [ ] Integrate with Python AI service
- [ ] Add authentication
- [ ] Add pagination metadata
- [ ] Add file download endpoint
- [ ] Add search & filter
