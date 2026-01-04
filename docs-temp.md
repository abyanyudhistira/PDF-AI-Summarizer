# Dokumentasi Lengkap - PDF AI Summarizer

## 📋 Daftar Isi
1. [Status Implementasi](#status-implementasi)
2. [Setup Database](#setup-database)
3. [Struktur Proyek](#struktur-proyek)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Cara Menjalankan Aplikasi](#cara-menjalankan-aplikasi)
7. [Testing Guide](#testing-guide)
8. [Konfigurasi](#konfigurasi)
9. [Troubleshooting](#troubleshooting)

---

## Status Implementasi

### ✅ Yang Sudah Selesai

#### 1. Database PostgreSQL
- **Status**: ✅ Running
- PostgreSQL 16 di Docker container
- Database: `pdf_summarizer`
- User: `admin` / Password: `admin123`
- Port: `5432`
- Volume persisten: `postgres_data`
- Tabel `pdf_files` dan `summaries` sudah dibuat otomatis

#### 2. Backend Golang
- **Status**: ✅ Running di port 8080
- Framework: Gin + GORM
- Fitur:
  - Auto-migration saat startup
  - CORS enabled
  - Error handling & validasi
  - Response utilities
  - Soft delete support

#### 3. File Upload & Storage
- **Status**: ✅ Siap untuk testing
- Validasi file PDF (hanya .pdf)
- Batas ukuran: **10 MB maksimal**
- Generate nama file unik: `{timestamp}_{uuid}_{nama_asli}.pdf`
- Folder upload: `backend/uploads/`
- Metadata disimpan ke database
- Cascade delete (hapus PDF = hapus semua summary)

#### 4. AI Service (Python)
- **Status**: ✅ Siap di port 8000
- Framework: FastAPI
- Fitur:
  - Simple summarization
  - Structured summarization (executive + bullets + highlights)
  - Multi-PDF summarization
  - Q&A berdasarkan PDF
  - Language detection (langdetect)
  - Multi-language support (15+ bahasa)
  - Page range selection
  - Google Gemini 2.5 Flash

### 📊 Status Endpoint

| Method | Endpoint | Deskripsi | Status |
|--------|----------|-----------|--------|
| GET | `/health` | Health check | ✅ Tested |
| POST | `/api/pdfs/upload` | Upload PDF | ✅ Ready |
| GET | `/api/pdfs` | List semua PDF | ✅ Tested |
| GET | `/api/pdfs/:id` | Get PDF spesifik | ✅ Ready |
| DELETE | `/api/pdfs/:id` | Hapus PDF | ✅ Ready |
| GET | `/api/pdfs/stats/count` | Statistik | ✅ Tested |

---

## Setup Database

### Prerequisites
- Docker Desktop installed dan running
- Docker Compose installed

### Langkah Setup

#### 1. Start PostgreSQL Container
```bash
docker-compose up -d
```

#### 2. Cek PostgreSQL Running
```bash
docker ps
```
Harus muncul container `postgres_db`.

#### 3. Cek Logs (Optional)
```bash
docker logs postgres_db
```

#### 4. Test Koneksi Database
```bash
docker exec -it postgres_db psql -U admin -d pdf_summarizer
```

Di dalam PostgreSQL shell:
```sql
\l              -- List semua database
\dt             -- List semua tabel
\q              -- Keluar
```

### Database Credentials
- **Host**: localhost
- **Port**: 5432
- **Database**: pdf_summarizer
- **Username**: admin
- **Password**: admin123
- **Connection URL**: `postgresql://admin:admin123@localhost:5432/pdf_summarizer`

### Perintah Berguna

**Stop PostgreSQL:**
```bash
docker-compose down
```

**Stop dan hapus data (HATI-HATI!):**
```bash
docker-compose down -v
```

**Restart PostgreSQL:**
```bash
docker-compose restart
```

**Lihat logs:**
```bash
docker-compose logs -f postgres
```

---

## Struktur Proyek

```
pdf-ai-summarizer/
├── backend/                    # Golang API (Gin + GORM)
│   ├── config/
│   │   └── config.go          # Load konfigurasi dari .env
│   ├── database/
│   │   └── database.go        # Koneksi database & migrasi
│   ├── handlers/
│   │   └── pdf_handler.go     # Handler CRUD PDF
│   ├── models/
│   │   ├── pdf_file.go        # Model PDFFile
│   │   └── summary.go         # Model Summary
│   ├── utils/
│   │   ├── file.go            # Validasi & generate nama file
│   │   └── response.go        # Format response JSON
│   ├── uploads/               # Folder penyimpanan PDF
│   │   └── .gitkeep
│   ├── main.go                # Entry point
│   ├── go.mod                 # Go dependencies
│   ├── .env                   # Environment variables
│   └── README.md
│
├── ai-service/                # Python AI Service (FastAPI)
│   ├── uploads/               # Temporary PDF storage
│   ├── main.py                # AI endpoints
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── README.md
│
├── frontend/                  # Next.js Frontend
│   ├── app/
│   │   ├── page.js           # Main page
│   │   ├── layout.js         # Layout
│   │   └── globals.css       # Global styles
│   ├── package.json
│   └── README.md
│
├── docker-compose.yml         # PostgreSQL container
└── DOKUMENTASI_LENGKAP.md    # File ini
```

---

## Database Schema

### Tabel: pdf_files
```sql
CREATE TABLE pdf_files (
    id              BIGSERIAL PRIMARY KEY,
    filename        VARCHAR(255) NOT NULL,      -- Nama file unik yang digenerate
    original_filename VARCHAR(255) NOT NULL,    -- Nama file asli dari user
    file_path       VARCHAR(500) NOT NULL,      -- Path lengkap ke file
    file_size       BIGINT NOT NULL,            -- Ukuran file dalam bytes
    total_pages     BIGINT,                     -- Jumlah halaman PDF
    upload_date     TIMESTAMPTZ,                -- Tanggal upload
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ                 -- Soft delete
);
```

### Tabel: summaries
```sql
CREATE TABLE summaries (
    id                  BIGSERIAL PRIMARY KEY,
    pdf_file_id         BIGINT NOT NULL,        -- FK ke pdf_files
    mode                VARCHAR(50) NOT NULL,   -- Mode summarization
    language            VARCHAR(50) DEFAULT 'english',
    pages_processed     VARCHAR(100),           -- Range halaman
    summary_text        TEXT,                   -- Simple summary
    executive_summary   TEXT,                   -- Structured summary
    bullets             TEXT,                   -- Key points
    highlights          TEXT,                   -- Important sentences
    qa_question         TEXT,                   -- Q&A question
    qa_answer           TEXT,                   -- Q&A answer
    processing_time     DECIMAL NOT NULL,       -- Waktu proses
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ,            -- Soft delete
    
    FOREIGN KEY (pdf_file_id) REFERENCES pdf_files(id) ON DELETE CASCADE
);
```

**Relasi:**
- Satu PDF bisa punya banyak summaries (one-to-many)
- Cascade delete: hapus PDF = hapus semua summaries-nya
- Soft delete: data tidak benar-benar dihapus dari database

---

## API Endpoints

### Backend Golang (Port 8080)

#### 1. Health Check
```bash
GET http://localhost:8080/health
```
**Response:**
```json
{
  "status": "ok",
  "message": "PDF Summarizer API is running"
}
```

#### 2. Upload PDF
```bash
POST http://localhost:8080/api/pdfs/upload
Content-Type: multipart/form-data
Body: file=[PDF file]
```
**Response (Success):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "filename": "1735545600_abc123_document.pdf",
    "original_filename": "document.pdf",
    "file_path": "./uploads/1735545600_abc123_document.pdf",
    "file_size": 524288,
    "file_size_mb": "0.50",
    "total_pages": null,
    "upload_date": "2025-12-30T14:20:00Z",
    "summary_count": 0
  }
}
```

**Response (Error - Bukan PDF):**
```json
{
  "success": false,
  "message": "Only PDF files are allowed"
}
```

**Response (Error - File Terlalu Besar):**
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 10 MB"
}
```

#### 3. List Semua PDF
```bash
GET http://localhost:8080/api/pdfs
GET http://localhost:8080/api/pdfs?page=1&limit=10
```
**Response:**
```json
{
  "success": true,
  "message": "PDFs fetched successfully",
  "data": [
    {
      "id": 1,
      "original_filename": "document.pdf",
      "file_size": 524288,
      "file_size_mb": "0.50",
      "total_pages": null,
      "upload_date": "2025-12-30T14:20:00Z",
      "summary_count": 2
    }
  ]
}
```

#### 4. Get PDF Spesifik
```bash
GET http://localhost:8080/api/pdfs/1
```
**Response:**
```json
{
  "success": true,
  "message": "PDF fetched successfully",
  "data": {
    "id": 1,
    "original_filename": "document.pdf",
    "file_size": 524288,
    "file_size_mb": "0.50",
    "total_pages": null,
    "upload_date": "2025-12-30T14:20:00Z",
    "summary_count": 2
  }
}
```

#### 5. Hapus PDF
```bash
DELETE http://localhost:8080/api/pdfs/1
```
**Response:**
```json
{
  "success": true,
  "message": "PDF deleted successfully",
  "data": null
}
```

#### 6. Get Statistik
```bash
GET http://localhost:8080/api/pdfs/stats/count
```
**Response:**
```json
{
  "success": true,
  "message": "Stats fetched successfully",
  "data": {
    "total_pdfs": 5,
    "total_summaries": 12
  }
}
```

### AI Service Python (Port 8000)

#### 1. Simple Summarization
```bash
POST http://localhost:8000/summarize
Content-Type: multipart/form-data
Body:
  - files: [PDF file(s)]
  - language: "Indonesian" (optional)
  - pages: "1-5, 7, 9" (optional)
```

#### 2. Structured Summarization
```bash
POST http://localhost:8000/summarize-structured
Content-Type: multipart/form-data
Body:
  - files: [PDF file(s)]
  - language: "Indonesian" (optional)
  - pages: "1-5" (optional)
```

#### 3. Multi-PDF Summarization
```bash
POST http://localhost:8000/summarize-multi
Content-Type: multipart/form-data
Body:
  - files: [Multiple PDF files]
  - language: "Indonesian" (optional)
```

#### 4. Question & Answer
```bash
POST http://localhost:8000/qa
Content-Type: multipart/form-data
Body:
  - question: "What is the main topic?"
  - files: [PDF file(s)]
  - language: "Indonesian" (optional)
```

---

## Cara Menjalankan Aplikasi

### 1. Start Database
```bash
docker-compose up -d
```
Tunggu sampai PostgreSQL siap (sekitar 10-15 detik).

### 2. Start Backend Golang
```bash
cd backend
go run main.go
```
Backend akan berjalan di: **http://localhost:8080**

Output yang diharapkan:
```
✅ Database connected successfully
✅ Database migration completed
Server starting on port 8080
```

### 3. Start AI Service Python
```bash
cd ai-service
pip install -r requirements.txt
python main.py
```
AI Service akan berjalan di: **http://localhost:8000**

### 4. Start Frontend Next.js
```bash
cd frontend
npm install
npm run dev
```
Frontend akan berjalan di: **http://localhost:3000**

---

## Testing Guide

### Quick Test Commands

#### 1. Health Check
```bash
curl http://localhost:8080/health
```

#### 2. Get Statistics
```bash
curl http://localhost:8080/api/pdfs/stats/count
```

#### 3. List PDFs
```bash
curl http://localhost:8080/api/pdfs
```

#### 4. Upload PDF
```bash
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@namafile.pdf"
```

#### 5. Get PDF by ID
```bash
curl http://localhost:8080/api/pdfs/1
```

#### 6. Delete PDF
```bash
curl -X DELETE http://localhost:8080/api/pdfs/1
```

### Testing dengan Postman

#### Upload PDF:
1. Buka Postman
2. Buat request baru: `POST http://localhost:8080/api/pdfs/upload`
3. Pilih tab "Body"
4. Pilih "form-data"
5. Tambah key: `file`, type: `File`
6. Pilih file PDF dari komputer
7. Klik "Send"

#### List PDFs:
- Method: `GET`
- URL: `http://localhost:8080/api/pdfs`

#### Delete PDF:
- Method: `DELETE`
- URL: `http://localhost:8080/api/pdfs/{id}`

### Validasi yang Ditest

✅ **File harus PDF** (ekstensi .pdf)
```bash
# Test dengan file non-PDF (harus ditolak)
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@document.txt"
```

✅ **Ukuran maksimal 10 MB**
```bash
# Test dengan file > 10 MB (harus ditolak)
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@large_file.pdf"
```

✅ **Nama file unik**
```bash
# Upload file yang sama 2x, nama file harus berbeda
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@test.pdf"
curl -X POST http://localhost:8080/api/pdfs/upload -F "file=@test.pdf"
# Hasilnya: 1735545600_abc123_test.pdf dan 1735545605_def456_test.pdf
```

### Verifikasi Database

```bash
# Masuk ke PostgreSQL
docker exec -it postgres_db psql -U admin -d pdf_summarizer

# Lihat semua PDF
SELECT id, original_filename, file_size, upload_date FROM pdf_files;

# Lihat semua summaries
SELECT id, pdf_file_id, mode, language, processing_time FROM summaries;

# Keluar
\q
```

### Tips Testing

1. Gunakan file PDF kecil dulu (< 1 MB) untuk test awal
2. Coba upload file yang sama 2x, nama file harus berbeda (karena UUID)
3. Coba upload file non-PDF, harus ditolak
4. Coba upload file > 10 MB, harus ditolak
5. Setelah upload, cek folder `backend/uploads/` untuk verifikasi file tersimpan
6. Cek database untuk verifikasi metadata tersimpan

---

## Konfigurasi

### Backend (.env)
File: `backend/.env`
```env
# Server Configuration
PORT=8080
GIN_MODE=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=pdf_summarizer
DB_SSLMODE=disable

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000

# File Upload Configuration
MAX_FILE_SIZE=10485760        # 10 MB dalam bytes
UPLOAD_DIR=./uploads
```

### AI Service (.env)
File: `ai-service/.env`
```env
GEMINI_API_KEY=your_api_key_here
```

### Docker Compose
File: `docker-compose.yml`
```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    container_name: postgres_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: pdf_summarizer
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Troubleshooting

### Port 5432 sudah digunakan
Jika PostgreSQL sudah terinstall di lokal:
```bash
# Windows - Stop PostgreSQL lokal
net stop postgresql-x64-15

# Atau ubah port di docker-compose.yml:
ports:
  - "5433:5432"  # Gunakan port 5433
```

### Connection refused
Pastikan Docker running dan container healthy:
```bash
docker-compose ps
docker logs postgres_db
```

### Backend tidak bisa connect ke database
1. Cek database running: `docker ps`
2. Cek credentials di `backend/.env`
3. Cek logs backend untuk error message

### File upload gagal
1. Cek folder `backend/uploads/` ada dan writable
2. Cek ukuran file < 10 MB
3. Cek file adalah PDF (.pdf extension)
4. Cek logs backend untuk error detail

### AI Service error
1. Cek `GEMINI_API_KEY` sudah diset di `ai-service/.env`
2. Cek dependencies terinstall: `pip install -r requirements.txt`
3. Cek port 8000 tidak digunakan aplikasi lain

---

## Fitur yang Sudah Diimplementasi

### File Management
- ✅ PDF upload dengan validasi
- ✅ Generate nama file unik
- ✅ Batas ukuran file (10 MB)
- ✅ Simpan metadata ke database
- ✅ List/Get/Delete operations
- ✅ Cascade delete (PDF + summaries)
- ✅ Soft delete

### AI Capabilities
- ✅ Simple summarization
- ✅ Structured summarization
- ✅ Multi-PDF summarization
- ✅ Question & Answer
- ✅ Language detection
- ✅ Multi-language support (15+ bahasa)
- ✅ Page range selection

### Database
- ✅ PostgreSQL dengan Docker
- ✅ Auto-migration
- ✅ Soft delete
- ✅ Foreign key constraints
- ✅ Cascade delete

### API
- ✅ RESTful endpoints
- ✅ CORS enabled
- ✅ Error handling
- ✅ Validasi input
- ✅ Pagination support

---

## Langkah Selanjutnya

### 1. Test File Upload (Sekarang)
- Upload file PDF menggunakan Postman atau curl
- Verifikasi file tersimpan di `backend/uploads/`
- Verifikasi data tersimpan di database
- Test validasi (file >10MB, file non-PDF)

### 2. Integrasi Backend dengan AI Service
- Buat endpoint untuk trigger summarization
- Kirim PDF ke AI service
- Simpan hasil summary ke database
- Track processing time

### 3. Integrasi dengan Frontend
- Connect form upload ke backend
- Tampilkan list PDF yang sudah diupload
- Tampilkan opsi summarization
- Tampilkan hasil summary

### 4. End-to-End Testing
- Upload → Summarize → Display workflow
- Multi-PDF summarization
- Q&A functionality
- Language selection

### 5. Production Readiness
- Add authentication
- Implement rate limiting
- Add logging
- Error monitoring
- Performance optimization

---

## Status Saat Ini

- **Backend Golang**: ✅ Running di port 8080
- **Database PostgreSQL**: ✅ Running di port 5432
- **AI Service Python**: ✅ Siap di port 8000
- **Frontend Next.js**: ⏳ Belum dijalankan
- **Total PDFs**: 0
- **Total Summaries**: 0

---

**Status**: ✅ **SIAP UNTUK TESTING**

Semua implementasi sudah selesai. Tinggal test upload file PDF menggunakan Postman atau curl untuk memastikan semuanya berjalan dengan baik.
