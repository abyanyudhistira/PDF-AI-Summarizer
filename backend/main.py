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

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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

def extract_text_from_pdf(file_stream):
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def summarize_text(text: str) -> str:
    try:
        truncated_text = text[:30000] # Increased limit for Gemini Flash (it has large context)
        
        prompt = f"""
        Please summarize the following document in clear, concise paragraphs.
        Respond strictly in the same language as the document's dominant language.
        Do not translate to another language; preserve domain terminology.
        Highlight key ideas and structure the summary for readability.

        Document content:
        {truncated_text}
        """

        response = gemini_model.generate_content(prompt)
        return response.text
            
    except Exception as e:
         print(f"AI Error (gemini): {e}")
         return f"Error generating summary: {str(e)}"

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

def summarize_structured(text: str) -> StructuredSummaryResponse:
    truncated_text = text[:30000]
    prompt = f"""
    You are a professional analyst. Read the document and respond ONLY as JSON.
    Keys: executive_summary (string), bullets (array of strings 5-10 items),
    highlights (array of the 5 most important sentences verbatim).
    Preserve the document's original language and terminology.

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
async def summarize_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        content = await file.read()
        file_stream = io.BytesIO(content)
        text = extract_text_from_pdf(file_stream)
        
        if not text.strip():
             raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        summary = summarize_text(text)
        
        return SummaryResponse(filename=file.filename, summary=summary, provider="gemini")
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize-structured", response_model=StructuredSummaryResponse)
async def summarize_pdf_structured(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    content = await file.read()
    text = extract_text_from_pdf(io.BytesIO(content))
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
    result = summarize_structured(text)
    result.filename = file.filename
    if not result.highlights or (len(result.highlights) < 3 and text):
        result.highlights = highlight_sentences(text, top_k=5)
    return result

@app.post("/summarize-multi", response_model=MultiSummaryResponse)
async def summarize_multi(files: List[UploadFile] = File(...)):
    items: List[StructuredSummaryResponse] = []
    combined_texts: List[str] = []
    for f in files:
        if not f.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{f.filename} must be a PDF")
        content = await f.read()
        text = extract_text_from_pdf(io.BytesIO(content))
        combined_texts.append(text)
        res = summarize_structured(text)
        res.filename = f.filename
        if not res.highlights or (len(res.highlights) < 3 and text):
            res.highlights = highlight_sentences(text, top_k=5)
        items.append(res)
    combined_summary = summarize_text("\n\n".join(combined_texts))
    return MultiSummaryResponse(items=items, combined_summary=combined_summary, provider="gemini")

class QAResponse(BaseModel):
    answer: str
    provider: str

@app.post("/qa", response_model=QAResponse)
async def qa_pdf(question: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    content = await file.read()
    text = extract_text_from_pdf(io.BytesIO(content))
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
    prompt = f"""
    Answer the question based ONLY on the document below.
    Respond in the same language as the document.
    Provide a concise, factual answer; if uncertain, say you cannot find it.

    Document:
    {text[:30000]}

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
