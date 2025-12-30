"""
AI Service for PDF Summarization
Pure AI service - handles only summarization using Google Gemini
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai
import io
from typing import List, Optional
import re
import json
from langdetect import detect, LangDetectException

load_dotenv()

app = FastAPI(
    title="PDF AI Summarization Service",
    description="AI-powered PDF summarization using Google Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY is required. Set it in your .env.")

genai.configure(api_key=gemini_api_key)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# ==================== RESPONSE MODELS ====================

class SummaryResponse(BaseModel):
    summary: str
    provider: str = "gemini"

class StructuredSummaryResponse(BaseModel):
    executive_summary: str
    bullets: List[str]
    highlights: List[str]
    provider: str = "gemini"

class MultiSummaryItem(BaseModel):
    filename: str
    executive_summary: str
    bullets: List[str]
    highlights: List[str]

class MultiSummaryResponse(BaseModel):
    items: List[MultiSummaryItem]
    combined_summary: str
    provider: str = "gemini"

class QAResponse(BaseModel):
    answer: str
    provider: str = "gemini"

# ==================== HELPER FUNCTIONS ====================

def detect_language(text: str) -> str:
    """Detect the language of the text"""
    try:
        sample = text[:1000].strip()
        if not sample:
            return "English"
        
        lang_code = detect(sample)
        
        lang_map = {
            'en': 'English', 'id': 'Indonesian', 'es': 'Spanish',
            'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
            'it': 'Italian', 'nl': 'Dutch', 'ru': 'Russian',
            'ja': 'Japanese', 'ko': 'Korean', 'zh-cn': 'Chinese',
            'zh-tw': 'Chinese', 'ar': 'Arabic', 'tr': 'Turkish',
            'vi': 'Vietnamese', 'th': 'Thai',
        }
        
        return lang_map.get(lang_code, 'English')
    except:
        return "English"

def parse_page_range(page_range_str: str, total_pages: int) -> List[int]:
    """Parse page range string like '1-5, 7, 9' into list of page numbers"""
    if not page_range_str or not page_range_str.strip():
        return list(range(total_pages))
    
    pages = set()
    parts = page_range_str.split(',')
    
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = part.split('-')
                start = max(1, min(int(start.strip()), total_pages))
                end = max(1, min(int(end.strip()), total_pages))
                pages.update(range(start - 1, end))
            except:
                continue
        else:
            try:
                page = int(part)
                if 1 <= page <= total_pages:
                    pages.add(page - 1)
            except:
                continue
    
    return sorted(list(pages))

def extract_text_from_pdf(file_stream, page_numbers: List[int] = None):
    """Extract text from PDF file"""
    try:
        reader = PdfReader(file_stream)
        total_pages = len(reader.pages)
        
        if page_numbers is None:
            page_numbers = list(range(total_pages))
        
        text = ""
        for page_num in page_numbers:
            if 0 <= page_num < total_pages:
                text += reader.pages[page_num].extract_text() + "\n"
        
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def extract_json(text: str) -> Optional[dict]:
    """Extract JSON from AI response"""
    try:
        return json.loads(text)
    except:
        try:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
        except:
            return None
    return None

def highlight_sentences(text: str, top_k: int = 5) -> List[str]:
    """Extract important sentences using frequency-based approach"""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if not sentences:
        return []
    
    words = re.findall(r"\b\w+\b", text.lower())
    freq = {}
    for w in words:
        if len(w) > 2:
            freq[w] = freq.get(w, 0) + 1
    
    scores = []
    for s in sentences:
        s_words = re.findall(r"\b\w+\b", s.lower())
        score = sum(freq.get(w, 0) for w in s_words)
        scores.append((score, s))
    
    scores.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scores[:top_k]]

# ==================== AI SUMMARIZATION FUNCTIONS ====================

def summarize_text(text: str, target_language: str = None) -> str:
    """Generate simple summary"""
    try:
        truncated_text = text[:30000]
        
        if not target_language:
            target_language = detect_language(truncated_text)
        
        prompt = f"""
        Please summarize the following document in clear, concise paragraphs.
        Respond strictly in {target_language}.
        Highlight key ideas and structure the summary for readability.

        Document content:
        {truncated_text}
        """
        response = gemini_model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating summary: {str(e)}"

def summarize_hierarchical(text: str, target_language: str = None) -> str:
    """Generate hierarchical summary for multiple documents"""
    try:
        truncated_text = text[:30000]
        
        if not target_language:
            target_language = detect_language(truncated_text)
        
        prompt = f"""
        Please provide a hierarchical summary of the following document. 
        Structure the summary with main topics, subtopics, and key details using nested bullet points.
        Respond strictly in {target_language}.
        
        Document content:
        {truncated_text}
        """
        response = gemini_model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating summary: {str(e)}"

def summarize_structured(text: str, target_language: str = None) -> dict:
    """Generate structured summary with executive summary, bullets, and highlights"""
    truncated_text = text[:30000]
    
    if not target_language:
        target_language = detect_language(truncated_text)
    
    prompt = f"""
    You are a professional analyst. Read the document and respond ONLY as JSON.
    Keys: executive_summary (string), bullets (array of strings 5-10 items),
    highlights (array of the 5 most important sentences verbatim).
    Respond strictly in {target_language}.

    Document:
    {truncated_text}
    """
    try:
        response = gemini_model.generate_content(prompt)
        data = extract_json(response.text or "")
        if not data:
            data = {
                "executive_summary": "Summary not available",
                "bullets": [],
                "highlights": []
            }
        return data
    except Exception as e:
        return {
            "executive_summary": f"Error: {str(e)}",
            "bullets": [],
            "highlights": []
        }

def summarize_structured_hierarchical(text: str, target_language: str = None) -> dict:
    """Generate hierarchical structured summary"""
    truncated_text = text[:30000]
    
    if not target_language:
        target_language = detect_language(truncated_text)
    
    prompt = f"""
    You are a professional analyst. Read the documents and respond ONLY as JSON.
    Use a hierarchical approach to organize information.
    Keys: executive_summary (string with hierarchical structure), 
    bullets (array of strings 5-8 items with hierarchical structure),
    highlights (array of the 5 most important sentences verbatim).
    Respond strictly in {target_language}.

    Documents:
    {truncated_text}
    """
    try:
        response = gemini_model.generate_content(prompt)
        data = extract_json(response.text or "")
        if not data:
            data = {
                "executive_summary": "Summary not available",
                "bullets": [],
                "highlights": []
            }
        return data
    except Exception as e:
        return {
            "executive_summary": f"Error: {str(e)}",
            "bullets": [],
            "highlights": []
        }

# ==================== API ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "service": "PDF AI Summarization Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": ["/summarize", "/summarize-structured", "/summarize-multi", "/qa"]
    }

@app.post("/summarize", response_model=SummaryResponse)
async def summarize_pdf(
    files: List[UploadFile] = File(...),
    language: str = Form(None),
    pages: str = Form(None)
):
    """Generate simple summary from PDF(s)"""
    all_texts = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        
        content = await file.read()
        file_stream = io.BytesIO(content)
        
        page_numbers = None
        if pages:
            reader = PdfReader(file_stream)
            total_pages = len(reader.pages)
            page_numbers = parse_page_range(pages, total_pages)
            file_stream.seek(0)
        
        text = extract_text_from_pdf(file_stream, page_numbers)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}")
        
        all_texts.append(text)
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    target_language = language.capitalize() if language and language != "english" else detect_language(combined_text)
    
    if len(files) > 1:
        summary = summarize_hierarchical(combined_text, target_language)
    else:
        summary = summarize_text(combined_text, target_language)
    
    return SummaryResponse(summary=summary)

@app.post("/summarize-structured", response_model=StructuredSummaryResponse)
async def summarize_pdf_structured(
    files: List[UploadFile] = File(...),
    language: str = Form(None),
    pages: str = Form(None)
):
    """Generate structured summary (executive summary, bullets, highlights)"""
    all_texts = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        
        content = await file.read()
        
        page_numbers = None
        if pages:
            file_stream = io.BytesIO(content)
            reader = PdfReader(file_stream)
            total_pages = len(reader.pages)
            page_numbers = parse_page_range(pages, total_pages)
        
        text = extract_text_from_pdf(io.BytesIO(content), page_numbers)
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}")
        all_texts.append(text)
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    target_language = language.capitalize() if language and language != "english" else detect_language(combined_text)
    
    if len(files) > 1:
        result = summarize_structured_hierarchical(combined_text, target_language)
    else:
        result = summarize_structured(combined_text, target_language)
    
    if not result.get("highlights") or len(result.get("highlights", [])) < 3:
        result["highlights"] = highlight_sentences(combined_text, top_k=5)
    
    return StructuredSummaryResponse(
        executive_summary=result.get("executive_summary", ""),
        bullets=result.get("bullets", []),
        highlights=result.get("highlights", [])
    )

@app.post("/summarize-multi", response_model=MultiSummaryResponse)
async def summarize_multi(
    files: List[UploadFile] = File(...),
    language: str = Form(None),
    pages: str = Form(None)
):
    """Generate summary for multiple PDFs (per-file + combined)"""
    items = []
    combined_texts = []
    
    for f in files:
        if not f.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{f.filename} must be a PDF")
        
        content = await f.read()
        
        page_numbers = None
        if pages:
            file_stream = io.BytesIO(content)
            reader = PdfReader(file_stream)
            total_pages = len(reader.pages)
            page_numbers = parse_page_range(pages, total_pages)
        
        text = extract_text_from_pdf(io.BytesIO(content), page_numbers)
        combined_texts.append(text)
        
        target_language = language.capitalize() if language and language != "english" else detect_language(text)
        
        if len(files) > 1:
            res = summarize_structured_hierarchical(text, target_language)
        else:
            res = summarize_structured(text, target_language)
        
        if not res.get("highlights") or len(res.get("highlights", [])) < 3:
            res["highlights"] = highlight_sentences(text, top_k=5)
        
        items.append(MultiSummaryItem(
            filename=f.filename,
            executive_summary=res.get("executive_summary", ""),
            bullets=res.get("bullets", []),
            highlights=res.get("highlights", [])
        ))
    
    combined_text = "\n\n".join(combined_texts)
    
    target_language = language.capitalize() if language and language != "english" else detect_language(combined_text)
    
    if len(files) > 1:
        combined_summary = summarize_hierarchical(combined_text, target_language)
    else:
        combined_summary = summarize_text(combined_text, target_language)
    
    return MultiSummaryResponse(
        items=items,
        combined_summary=combined_summary
    )

@app.post("/qa", response_model=QAResponse)
async def qa_pdf(
    question: str = Form(...),
    files: List[UploadFile] = File(...),
    language: str = Form(None),
    pages: str = Form(None)
):
    """Answer questions based on PDF content"""
    all_texts = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        
        content = await file.read()
        
        page_numbers = None
        if pages:
            file_stream = io.BytesIO(content)
            reader = PdfReader(file_stream)
            total_pages = len(reader.pages)
            page_numbers = parse_page_range(pages, total_pages)
        
        text = extract_text_from_pdf(io.BytesIO(content), page_numbers)
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}")
        all_texts.append(text)
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    target_language = language.capitalize() if language and language != "english" else detect_language(combined_text)
    
    prompt = f"""
    Answer the question based ONLY on the document(s) below.
    Respond strictly in {target_language}.
    Provide a concise, factual answer; if uncertain, say you cannot find it.

    Document(s):
    {combined_text[:30000]}

    Question:
    {question}
    """
    try:
        response = gemini_model.generate_content(prompt)
        return QAResponse(answer=response.text or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
