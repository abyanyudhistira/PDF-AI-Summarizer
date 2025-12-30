# PDF AI Summarization Service

Pure AI service untuk PDF summarization menggunakan Google Gemini AI.

## Features

- ✅ **Simple Summary** - Ringkasan sederhana dalam paragraf
- ✅ **Structured Summary** - Executive summary + bullets + highlights
- ✅ **Multi PDF Summary** - Ringkasan per-file + gabungan
- ✅ **Q&A** - Tanya jawab berdasarkan isi PDF
- ✅ **Language Detection** - Auto-detect bahasa dari PDF
- ✅ **Multi-language Support** - Support 15+ bahasa
- ✅ **Page Range Selection** - Pilih halaman tertentu untuk diringkas
- ✅ **Multiple Files** - Upload multiple PDF sekaligus

## Tech Stack

- **FastAPI** - Web framework
- **Google Gemini AI** - AI model untuk summarization
- **PyPDF2** - PDF text extraction
- **langdetect** - Language detection

## Setup

### 1. Install Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Service

```bash
python main.py
```

Service will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /
```

### Simple Summary
```
POST /summarize
Content-Type: multipart/form-data

Body:
- files: PDF file(s)
- language: (optional) english|indonesian|spanish|french|german
- pages: (optional) "1-5, 7, 9" or "all"
```

### Structured Summary
```
POST /summarize-structured
Content-Type: multipart/form-data

Body:
- files: PDF file(s)
- language: (optional)
- pages: (optional)

Response:
{
  "executive_summary": "...",
  "bullets": ["...", "..."],
  "highlights": ["...", "..."],
  "provider": "gemini"
}
```

### Multi PDF Summary
```
POST /summarize-multi
Content-Type: multipart/form-data

Body:
- files: Multiple PDF files
- language: (optional)
- pages: (optional)

Response:
{
  "items": [
    {
      "filename": "...",
      "executive_summary": "...",
      "bullets": [...],
      "highlights": [...]
    }
  ],
  "combined_summary": "...",
  "provider": "gemini"
}
```

### Q&A
```
POST /qa
Content-Type: multipart/form-data

Body:
- files: PDF file(s)
- question: Your question
- language: (optional)
- pages: (optional)

Response:
{
  "answer": "...",
  "provider": "gemini"
}
```

## Usage Examples

### cURL Example

```bash
# Simple summary
curl -X POST "http://localhost:8000/summarize" \
  -F "files=@document.pdf" \
  -F "language=indonesian"

# With page range
curl -X POST "http://localhost:8000/summarize" \
  -F "files=@document.pdf" \
  -F "language=english" \
  -F "pages=1-5, 10"

# Q&A
curl -X POST "http://localhost:8000/qa" \
  -F "files=@document.pdf" \
  -F "question=What is the main topic?" \
  -F "language=english"
```

### Python Example

```python
import requests

url = "http://localhost:8000/summarize"
files = {"files": open("document.pdf", "rb")}
data = {"language": "indonesian"}

response = requests.post(url, files=files, data=data)
print(response.json())
```

## Supported Languages

- English
- Indonesian
- Spanish
- French
- German
- Portuguese
- Italian
- Dutch
- Russian
- Japanese
- Korean
- Chinese
- Arabic
- Turkish
- Vietnamese
- Thai

## Notes

- Maximum text length per request: 30,000 characters
- AI model: Google Gemini 2.5 Flash
- Auto language detection if language not specified
- Page range format: "1-5, 7, 9" (comma-separated, ranges with dash)
