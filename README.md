# PDF AI Summarizer

Aplikasi ringkas PDF berbasis web dengan frontend Next.js dan backend FastAPI. Ringkasan dihasilkan menggunakan Gemini tanpa menyertakan API key di repository.

## Arsitektur
- `frontend/` Next.js (App Router) + Tailwind (v4)
- `backend/` FastAPI dengan endpoint `POST /summarize`
- Komunikasi: Frontend memanggil `http://localhost:8000/summarize`

## Prasyarat
- Node.js 18+
- Python 3.10+
- Paket manager (npm)
- Akun Google AI Studio untuk mendapatkan `GEMINI_API_KEY` (nilai tidak ditaruh di repo)

## Menjalankan Backend (FastAPI)
1. Masuk ke folder backend
   ```bash
   cd backend
   ```
2. (Opsional) Buat virtual environment
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   ```
3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
4. Buat file `.env` di folder `backend` dan isi variabel berikut tanpa memasukkan nilai ke repository:
   ```env
   GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
   ```
   Pastikan nilai key diisi di mesin lokal Anda, bukan dikomit.

5. Jalankan server
   ```bash
   python main.py
   ```
   Server akan berjalan di `http://localhost:8000`.

## Menjalankan Frontend (Next.js)
1. Masuk ke folder frontend
   ```bash
   cd frontend
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Jalankan pengembangan
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

## Cara Pakai
- Buka halaman utama, klik kotak upload atau tombol untuk memilih file PDF.
- Tekan `Summarize PDF`. Frontend akan mengirim file ke backend dan menampilkan ringkasan.
- Setelah ringkasan muncul, tersedia tombol `Copy` dan `Download` untuk hasil ringkasan.

## Catatan Keamanan
- Jangan menyimpan `GEMINI_API_KEY` di repository atau file publik.
- Simpan variabel pada `.env` lokal atau secret manager.

## Troubleshooting
- 400 "File must be a PDF": pastikan ekstensi `.pdf`.
- 400 "Could not extract text from PDF": PDF mungkin berbentuk gambar/non-selectable; pertimbangkan OCR.
- 500 "Error generating summary": pastikan backend berjalan dan `GEMINI_API_KEY` valid.
- CORS: backend sudah mengizinkan semua origin untuk pengembangan.

## Skrip Penting
- Backend: `python main.py`
- Frontend: `npm run dev`
