import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import init_settings
from app.rag_engine import rag_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize LLM and Embedding models once on server startup
    init_settings()
    yield

app = FastAPI(
    title="LlamaIndex Multi-Modal Document RAG",
    description="Interactive RAG interface for Webpages, PDFs, and TXT files powered by Groq and LlamaIndex",
    lifespan=lifespan
)

# Request schemas
class IndexRequest(BaseModel):
    url: str

class QueryRequest(BaseModel):
    question: str

# API Endpoints
@app.get("/api/status")
async def get_status():
    """Check if an index is currently loaded and which source is active."""
    return rag_engine.get_status()

@app.post("/api/index")
async def index_webpage(request: IndexRequest):
    """Scrape and index a webpage."""
    url = request.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    success, message = rag_engine.index_url(url)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "status": "success",
        "message": message,
        "source_type": "url",
        "source_name": url
    }

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and index a PDF or TXT document."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".md", ".log", ".csv", ".json"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or TXT file.")

    # Save to a temporary file safely
    suffix = ext
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / f"upload_{os.urandom(6).hex()}{suffix}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        success, message = rag_engine.index_file(str(temp_path), filename=file.filename)
        if not success:
            raise HTTPException(status_code=400, detail=message)

        return {
            "status": "success",
            "message": message,
            "source_type": "file",
            "source_name": file.filename
        }
    finally:
        # Clean up temporary file to prevent storage bloat
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

@app.post("/api/query")
async def query_index(request: QueryRequest):
    """Query the indexed webpage or document."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        answer = rag_engine.query(question)
        return {
            "status": "success",
            "answer": answer
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

@app.post("/api/reset")
async def reset_chat():
    """Reset the conversational memory buffer."""
    rag_engine.reset_chat()
    return {
        "status": "success",
        "message": "Conversation memory reset successfully."
    }

# Mount static files directory
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_index():
    """Serve the single-page application frontend."""
    return FileResponse(STATIC_DIR / "index.html")
