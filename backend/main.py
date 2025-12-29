from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise RuntimeError("GEMINI_API_KEY is required. Set it in your .env.")
genai.configure(api_key=gemini_api_key)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

class SummaryResponse(BaseModel):
    filename: str
    summary: str
    provider: str

class StructuredSummaryResponse(BaseModel):
    filename: str
    executive_summary: str
    bullets: List[str]
    highlights: List[str]
    provider: str

class MultiSummaryResponse(BaseModel):
    items: List[StructuredSummaryResponse]
    combined_summary: str
    provider: str

def detect_language(text: str) -> str:
    """Detect the language of the text and return language name"""
    try:
        # Take a sample of text for detection (first 1000 chars)
        sample = text[:1000].strip()
        if not sample:
            return "English"
        
        lang_code = detect(sample)
        
        # Map language codes to full names
        lang_map = {
            'en': 'English',
            'id': 'Indonesian',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'pt': 'Portuguese',
            'it': 'Italian',
            'nl': 'Dutch',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh-cn': 'Chinese',
            'zh-tw': 'Chinese',
            'ar': 'Arabic',
            'tr': 'Turkish',
            'vi': 'Vietnamese',
            'th': 'Thai',
        }
        
        return lang_map.get(lang_code, 'English')
    except LangDetectException:
        return "English"
    except Exception as e:
        print(f"Language detection error: {e}")
        return "English"

def extract_text_from_pdf(file_stream):
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def summarize_text(text: str, target_language: str = None) -> str:
    try:
        truncated_text = text[:30000]
        
        # Detect language if not provided
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
        print(f"AI Error: {e}")
        return f"Error generating summary: {str(e)}"

def summarize_hierarchical(text: str, target_language: str = None) -> str:
    try:
        truncated_text = text[:30000]
        
        # Detect language if not provided
        if not target_language:
            target_language = detect_language(truncated_text)
        
        prompt = f"""
        Please provide a hierarchical summary of the following document. 
        Structure the summary with main topics, subtopics, and key details using nested bullet points or a clear outline format. 
        Respond strictly in {target_language}.
        
        Document content:
        {truncated_text}
        """
        response = gemini_model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"AI Error: {e}")
        return f"Error generating hierarchical summary: {str(e)}"

def _extract_json(text: str) -> Optional[dict]:
    try:
        return json.loads(text)
    except Exception:
        try:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group(0))
        except Exception:
            return None
    return None

def summarize_structured(text: str, target_language: str = None) -> StructuredSummaryResponse:
    truncated_text = text[:30000]
    
    # Detect language if not provided
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
        data = _extract_json(response.text or "")
        if not data:
            data = {
                "executive_summary": "Summary not available",
                "bullets": [],
                "highlights": []
            }
        return StructuredSummaryResponse(
            filename="",
            executive_summary=data.get("executive_summary", ""),
            bullets=list(map(str, data.get("bullets", []))),
            highlights=list(map(str, data.get("highlights", []))),
            provider="gemini",
        )
    except Exception as e:
        return StructuredSummaryResponse(
            filename="",
            executive_summary=f"Error generating summary: {str(e)}",
            bullets=[],
            highlights=[],
            provider="gemini",
        )

def summarize_structured_hierarchical(text: str, target_language: str = None) -> StructuredSummaryResponse:
    truncated_text = text[:30000]
    
    # Detect language if not provided
    if not target_language:
        target_language = detect_language(truncated_text)
    
    prompt = f"""
    You are a professional analyst. Read the multiple documents and respond ONLY as JSON.
    Use a hierarchical approach to organize information from multiple documents.
    Keys: executive_summary (string with hierarchical structure using bullet points and indentation), 
    bullets (array of strings 5-8 items organized by document/topic with hierarchical structure),
    highlights (array of the 5 most important sentences verbatim from across all documents).
    Respond strictly in {target_language}.

    Documents:
    {truncated_text}
    """
    try:
        response = gemini_model.generate_content(prompt)
        data = _extract_json(response.text or "")
        if not data:
            data = {
                "executive_summary": "Summary not available",
                "bullets": [],
                "highlights": []
            }
        return StructuredSummaryResponse(
            filename="",
            executive_summary=data.get("executive_summary", ""),
            bullets=list(map(str, data.get("bullets", []))),
            highlights=list(map(str, data.get("highlights", []))),
            provider="gemini",
        )
    except Exception as e:
        return StructuredSummaryResponse(
            filename="",
            executive_summary=f"Error generating summary: {str(e)}",
            bullets=[],
            highlights=[],
            provider="gemini",
        )

def highlight_sentences(text: str, top_k: int = 5) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if not sentences:
        return []
    words = re.findall(r"\b\w+\b", text.lower())
    freq = {}
    for w in words:
        if len(w) <= 2:
            continue
        freq[w] = freq.get(w, 0) + 1
    scores = []
    for s in sentences:
        s_words = re.findall(r"\b\w+\b", s.lower())
        score = sum(freq.get(w, 0) for w in s_words)
        scores.append((score, s))
    scores.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scores[:top_k]]

@app.post("/summarize", response_model=SummaryResponse)
async def summarize_pdf(files: List[UploadFile] = File(...), language: str = Form(None)):
    all_texts = []
    filenames = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        
        try:
            content = await file.read()
            file_stream = io.BytesIO(content)
            text = extract_text_from_pdf(file_stream)
            
            if not text.strip():
                raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}.")
            
            all_texts.append(text)
            filenames.append(file.filename)
        
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=str(e))
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    # Use user-selected language or detect from document
    if language and language != "english":
        target_language = language.capitalize()
    else:
        target_language = detect_language(combined_text)
    
    print(f"Target language: {target_language}")
    
    if len(files) > 1:
        summary = summarize_hierarchical(combined_text, target_language)
    else:
        summary = summarize_text(combined_text, target_language)
    
    if len(filenames) == 1:
        display_name = filenames[0]
    else:
        display_name = f"{len(filenames)} PDFs: {', '.join(filenames)}"
    
    return SummaryResponse(filename=display_name, summary=summary, provider="gemini")

@app.post("/summarize-structured", response_model=StructuredSummaryResponse)
async def summarize_pdf_structured(files: List[UploadFile] = File(...), language: str = Form(None)):
    all_texts = []
    filenames = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        content = await file.read()
        text = extract_text_from_pdf(io.BytesIO(content))
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}.")
        all_texts.append(text)
        filenames.append(file.filename)
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    # Use user-selected language or detect from document
    if language and language != "english":
        target_language = language.capitalize()
    else:
        target_language = detect_language(combined_text)
    
    print(f"Target language: {target_language}")
    
    if len(files) > 1:
        result = summarize_structured_hierarchical(combined_text, target_language)
    else:
        result = summarize_structured(combined_text, target_language)
    
    if len(filenames) == 1:
        result.filename = filenames[0]
    else:
        result.filename = f"{len(filenames)} PDFs: {', '.join(filenames)}"
    
    if not result.highlights or (len(result.highlights) < 3 and combined_text):
        result.highlights = highlight_sentences(combined_text, top_k=5)
    return result

@app.post("/summarize-multi", response_model=MultiSummaryResponse)
async def summarize_multi(files: List[UploadFile] = File(...), language: str = Form(None)):
    items: List[StructuredSummaryResponse] = []
    combined_texts: List[str] = []
    
    for f in files:
        if not f.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{f.filename} must be a PDF")
        content = await f.read()
        text = extract_text_from_pdf(io.BytesIO(content))
        combined_texts.append(text)
        
        # Use user-selected language or detect from document
        if language and language != "english":
            target_language = language.capitalize()
        else:
            target_language = detect_language(text)
        
        if len(files) > 1:
            res = summarize_structured_hierarchical(text, target_language)
        else:
            res = summarize_structured(text, target_language)
        
        res.filename = f.filename
        if not res.highlights or (len(res.highlights) < 3 and text):
            res.highlights = highlight_sentences(text, top_k=5)
        items.append(res)
    
    combined_text = "\n\n".join(combined_texts)
    
    # Use user-selected language or detect from combined document
    if language and language != "english":
        target_language = language.capitalize()
    else:
        target_language = detect_language(combined_text)
    
    print(f"Target language for combined summary: {target_language}")
    
    if len(files) > 1:
        combined_summary = summarize_hierarchical(combined_text, target_language)
    else:
        combined_summary = summarize_text(combined_text, target_language)
    return MultiSummaryResponse(items=items, combined_summary=combined_summary, provider="gemini")

class QAResponse(BaseModel):
    answer: str
    provider: str

@app.post("/qa", response_model=QAResponse)
async def qa_pdf(question: str = Form(...), files: List[UploadFile] = File(...), language: str = Form(None)):
    all_texts = []
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF")
        content = await file.read()
        text = extract_text_from_pdf(io.BytesIO(content))
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"Could not extract text from {file.filename}.")
        all_texts.append(text)
    
    combined_text = "\n\n--- Next Document ---\n\n".join(all_texts)
    
    # Use user-selected language or detect from document
    if language and language != "english":
        target_language = language.capitalize()
    else:
        target_language = detect_language(combined_text)
    
    print(f"Target language for Q&A: {target_language}")
    
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
        return QAResponse(answer=response.text or "", provider="gemini")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExportRequest(BaseModel):
    filename: str
    executive_summary: str
    bullets: List[str]
    highlights: List[str]
    qa_pairs: List[dict] = []
    format: str

@app.post("/export")
async def export_result(req: ExportRequest):
    fmt = req.format.lower()
    if fmt not in {"json", "txt", "csv"}:
        raise HTTPException(status_code=400, detail="Unsupported format")
    
    if fmt == "json":
        payload = {
            "filename": req.filename,
            "executive_summary": req.executive_summary,
            "bullets": req.bullets,
            "highlights": req.highlights,
            "qa_pairs": req.qa_pairs,
        }
        data = json.dumps(payload, ensure_ascii=False, indent=2)
        return Response(
            content=data,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{req.filename}.json"'},
        )
    
    if fmt == "txt":
        lines = []
        lines.append(f"Filename: {req.filename}")
        lines.append("")
        lines.append("Executive Summary:")
        lines.append(req.executive_summary)
        lines.append("")
        lines.append("Bullets:")
        for b in req.bullets:
            lines.append(f"- {b}")
        lines.append("")
        lines.append("Highlights:")
        for h in req.highlights:
            lines.append(f"* {h}")
        lines.append("")
        if req.qa_pairs:
            lines.append("Q&A:")
            for qa in req.qa_pairs:
                q = str(qa.get("question", ""))
                a = str(qa.get("answer", ""))
                lines.append(f"Q: {q}")
                lines.append(f"A: {a}")
                lines.append("")
        data = "\n".join(lines)
        return Response(
            content=data,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{req.filename}.txt"'},
        )
    
    if fmt == "csv":
        rows = ["type,text"]
        for b in req.bullets:
            rows.append(f'bullet,"{b.replace("\\", "\\\\").replace("\\n", " ").replace("\\r", "")}"')
        for h in req.highlights:
            rows.append(f'highlight,"{h.replace("\\", "\\\\").replace("\\n", " ").replace("\\r", "")}"')
        for qa in req.qa_pairs:
            q = str(qa.get("question", "")).replace('"', '\\"')
            a = str(qa.get("answer", "")).replace('"', '\\"')
            rows.append(f'qa_question,"{q}"')
            rows.append(f'qa_answer,"{a}"')
        data = "\n".join(rows)
        return Response(
            content=data,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{req.filename}.csv"'},
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
