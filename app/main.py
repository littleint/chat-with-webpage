from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

from app.config import init_settings
from app.rag_engine import rag_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize LLM and Embedding models once on server startup
    init_settings()
    yield

app = FastAPI(
    title="LlamaIndex Webpage Reader RAG",
    description="Web Q&A interface powered by LlamaIndex and Groq",
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
    """Check if an index is currently loaded and which URL."""
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
        "url": url
    }

@app.post("/api/query")
async def query_index(request: QueryRequest):
    """Query the indexed webpage."""
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

# Mount static files directory
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_index():
    """Serve the single-page application frontend."""
    return FileResponse(STATIC_DIR / "index.html")
