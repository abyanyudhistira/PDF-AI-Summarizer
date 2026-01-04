# Panduan Testing dengan Postman

## Setup Awal

1. Buka Postman
2. Buat Collection baru: "PDF Summarizer API"
3. Set Base URL: `http://localhost:8080`

---

## 1. Health Check

**Method:** `GET`  
**URL:** `http://localhost:8080/health`

**Steps:**
1. Pilih method `GET`
2. Masukkan URL
3. Klik **Send**

**Expected Response:**
```json
{
  "status": "ok",
  "message": "PDF Summarizer API is running"
}
```

---

## 2. Upload PDF

**Method:** `POST`  
**URL:** `http://localhost:8080/api/pdfs/upload`

**Steps:**
1. Pilih method `POST`
2. Masukkan URL
3. Pilih tab **Body**
4. Pilih **form-data**
5. Tambah key: `file`
6. Ubah type dari `Text` ke `File` (klik dropdown di sebelah kanan)
7. Klik **Select Files** dan pilih PDF dari komputer
8. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "filename": "1735545600_abc123_dokumen.pdf",
    "original_filename": "dokumen.pdf",
    "file_path": "./uploads/1735545600_abc123_dokumen.pdf",
    "file_size": 524288,
    "file_size_mb": "0.50",
    "upload_date": "2025-12-30T10:00:00Z"
  }
}
```

**⚠️ PENTING:** Catat `id` dari response (misal: `1`), akan digunakan untuk summarization.

---

## 3. List PDFs

**Method:** `GET`  
**URL:** `http://localhost:8080/api/pdfs`

**Steps:**
1. Pilih method `GET`
2. Masukkan URL
3. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "PDFs fetched successfully",
  "data": [
    {
      "id": 1,
      "original_filename": "dokumen.pdf",
      "file_size": 524288,
      "file_size_mb": "0.50",
      "upload_date": "2025-12-30T10:00:00Z",
      "summary_count": 0
    }
  ]
}
```

---

## 4. Get PDF Detail

**Method:** `GET`  
**URL:** `http://localhost:8080/api/pdfs/1`

**Steps:**
1. Pilih method `GET`
2. Masukkan URL (ganti `1` dengan ID PDF kamu)
3. Klik **Send**

---

## 5. Summarize PDF (Simple Mode)

**Method:** `POST`  
**URL:** `http://localhost:8080/api/pdfs/1/summarize`

**Steps:**
1. Pilih method `POST`
2. Masukkan URL (ganti `1` dengan ID PDF kamu)
3. Pilih tab **Body**
4. Pilih **raw**
5. Pilih **JSON** dari dropdown (di sebelah kanan)
6. Masukkan JSON:
```json
{
  "mode": "simple",
  "language": "Indonesian"
}
```
7. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "Summary created successfully",
  "data": {
    "id": 1,
    "pdf_file_id": 1,
    "mode": "simple",
    "language": "indonesian",
    "summary_text": "Ringkasan dokumen dalam bahasa Indonesia...",
    "processing_time": 3.45,
    "created_at": "2025-12-30T10:00:00Z"
  }
}
```

**⏱️ Note:** Proses ini bisa memakan waktu 3-10 detik tergantung ukuran PDF.

---

## 6. Summarize PDF (Structured Mode)

**Method:** `POST`  
**URL:** `http://localhost:8080/api/pdfs/1/summarize`

**Body (JSON):**
```json
{
  "mode": "structured",
  "language": "Indonesian",
  "pages": "1-5"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Summary created successfully",
  "data": {
    "id": 2,
    "pdf_file_id": 1,
    "mode": "structured",
    "language": "indonesian",
    "pages_processed": "1-5",
    "executive_summary": "Ringkasan eksekutif...",
    "bullets": "[\"Poin 1\",\"Poin 2\",\"Poin 3\"]",
    "highlights": "[\"Kalimat penting 1\",\"Kalimat penting 2\"]",
    "processing_time": 4.12,
    "created_at": "2025-12-30T10:05:00Z"
  }
}
```

---

## 7. Summarize PDF (QA Mode)

**Method:** `POST`  
**URL:** `http://localhost:8080/api/pdfs/1/summarize`

**Body (JSON):**
```json
{
  "mode": "qa",
  "question": "Apa topik utama dokumen ini?",
  "language": "Indonesian"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Summary created successfully",
  "data": {
    "id": 3,
    "pdf_file_id": 1,
    "mode": "qa",
    "language": "indonesian",
    "qa_question": "Apa topik utama dokumen ini?",
    "qa_answer": "Topik utama dokumen ini adalah...",
    "processing_time": 2.89,
    "created_at": "2025-12-30T10:10:00Z"
  }
}
```

---

## 8. List Summaries untuk PDF

**Method:** `GET`  
**URL:** `http://localhost:8080/api/pdfs/1/summaries`

**Steps:**
1. Pilih method `GET`
2. Masukkan URL (ganti `1` dengan ID PDF kamu)
3. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "Summaries fetched successfully",
  "data": [
    {
      "id": 1,
      "pdf_file_id": 1,
      "mode": "simple",
      "language": "indonesian",
      "summary_text": "Ringkasan...",
      "processing_time": 3.45,
      "created_at": "2025-12-30T10:00:00Z"
    },
    {
      "id": 2,
      "pdf_file_id": 1,
      "mode": "structured",
      "language": "indonesian",
      "executive_summary": "Ringkasan eksekutif...",
      "processing_time": 4.12,
      "created_at": "2025-12-30T10:05:00Z"
    }
  ]
}
```

---

## 9. Get Summary Detail

**Method:** `GET`  
**URL:** `http://localhost:8080/api/summaries/1`

**Steps:**
1. Pilih method `GET`
2. Masukkan URL (ganti `1` dengan ID summary)
3. Klik **Send**

---

## 10. Delete Summary

**Method:** `DELETE`  
**URL:** `http://localhost:8080/api/summaries/1`

**Steps:**
1. Pilih method `DELETE`
2. Masukkan URL (ganti `1` dengan ID summary)
3. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "Summary deleted successfully",
  "data": null
}
```

---

## 11. Delete PDF

**Method:** `DELETE`  
**URL:** `http://localhost:8080/api/pdfs/1`

**Steps:**
1. Pilih method `DELETE`
2. Masukkan URL (ganti `1` dengan ID PDF)
3. Klik **Send**

**Expected Response:**
```json
{
  "success": true,
  "message": "PDF deleted successfully",
  "data": null
}
```

**⚠️ Note:** Menghapus PDF akan otomatis menghapus semua summary-nya (cascade delete).

---

## 12. Get Statistics

**Method:** `GET`  
**URL:** `http://localhost:8080/api/pdfs/stats/count`

**Expected Response:**
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

---

## Flow Testing Lengkap

### Scenario 1: Upload & Summarize
```
1. Upload PDF → dapat ID = 1
2. Summarize (simple) → dapat summary ID = 1
3. Summarize (structured) → dapat summary ID = 2
4. List summaries → lihat 2 summary
5. Get summary detail → lihat detail summary
```

### Scenario 2: Multiple PDFs
```
1. Upload PDF 1 → ID = 1
2. Upload PDF 2 → ID = 2
3. Summarize PDF 1 (simple)
4. Summarize PDF 2 (structured)
5. Get stats → total_pdfs: 2, total_summaries: 2
```

### Scenario 3: QA Mode
```
1. Upload PDF → ID = 1
2. Summarize (qa) dengan question: "Apa topik utama?"
3. Summarize (qa) dengan question: "Siapa penulisnya?"
4. List summaries → lihat 2 QA results
```

---

## Tips Postman

### 1. Save Requests
Simpan setiap request ke Collection untuk digunakan lagi.

### 2. Environment Variables
Buat environment variable untuk base URL:
- Variable: `base_url`
- Value: `http://localhost:8080`
- Usage: `{{base_url}}/api/pdfs/upload`

### 3. Tests Script
Tambahkan test script untuk auto-save ID:
```javascript
// Di tab "Tests" untuk Upload PDF
var jsonData = pm.response.json();
pm.environment.set("pdf_id", jsonData.data.id);

// Kemudian gunakan: {{pdf_id}} di request lain
```

### 4. Collection Runner
Jalankan semua request sekaligus dengan Collection Runner.

---

## Troubleshooting

### Error: Connection Refused
- Pastikan backend running: `go run main.go`
- Check port 8080 tidak digunakan aplikasi lain

### Error: PDF not found
- Pastikan ID PDF benar
- Check dengan `GET /api/pdfs` untuk lihat semua PDF

### Error: AI service error
- Pastikan AI service running: `python main.py`
- Check port 8000 tidak digunakan aplikasi lain
- Pastikan `GEMINI_API_KEY` sudah diset di `ai-service/.env`

### Timeout
- Summarization bisa memakan waktu 3-10 detik
- Increase timeout di Postman Settings → General → Request timeout

### Invalid JSON
- Pastikan pilih **raw** dan **JSON** di Body
- Check JSON syntax dengan validator online

---

## Status Check

Sebelum testing, pastikan semua service running:

```bash
# 1. Database
docker ps
# Harus ada: postgres_db

# 2. Backend
# Terminal 1: cd backend && go run main.go
# Output: Server starting on port 8080

# 3. AI Service
# Terminal 2: cd ai-service && python main.py
# Output: Uvicorn running on http://0.0.0.0:8000
```

---

## Next Steps

Setelah berhasil test dengan Postman:
1. ✅ Integrasi dengan Frontend
2. ✅ Add authentication
3. ✅ Add rate limiting
4. ✅ Deploy to production
