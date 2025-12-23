from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import google.generativeai as genai
import io

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
        Highlight key ideas and structure the summary for readability.l

        Document content:
        {truncated_text}
        """

        response = gemini_model.generate_content(prompt)
        return response.text
            
    except Exception as e:
         print(f"AI Error (gemini): {e}")
         return f"Error generating summary: {str(e)}"

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
