import os
from dotenv import load_dotenv

from llama_index.core import Settings
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def init_settings():
    """Initialize LlamaIndex LLM and Embedding settings once in memory."""
    if not GROQ_API_KEY:
        print("Warning: GROQ_API_KEY is not set in your .env file!")
        
    print("Loading LLM (Groq: openai/gpt-oss-120b)...", flush=True)
    Settings.llm = Groq(
        model="openai/gpt-oss-120b",
        api_key=GROQ_API_KEY
    )
    
    print("Loading Embedding Model (BAAI/bge-small-en-v1.5) into RAM...", flush=True)
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    print("AI Engine ready in memory!", flush=True)
