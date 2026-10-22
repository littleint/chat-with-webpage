import os
from typing import Optional, List, Tuple
from llama_index.core import VectorStoreIndex, Document
from llama_index.core.memory import ChatMemoryBuffer
from app.loaders import load_web_url, load_pdf_file, load_txt_file

class RAGEngine:
    """Manages document ingestion (Web, PDF, TXT), indexing, and conversational memory."""

    def __init__(self):
        self.source_type: Optional[str] = None  # "url" or "file"
        self.source_name: Optional[str] = None  # URL or File Name
        self.index: Optional[VectorStoreIndex] = None
        self.chat_engine = None
        self.memory: Optional[ChatMemoryBuffer] = None

    def _build_index(self, documents: List[Document], source_type: str, source_name: str) -> Tuple[bool, str]:
        """Internal helper to vectorize documents and set up chat engine with memory."""
        try:
            print(f"Building vector index for {source_name} ({len(documents)} document chunk(s))...", flush=True)
            self.index = VectorStoreIndex.from_documents(documents)

            # In-RAM conversational memory buffer
            self.memory = ChatMemoryBuffer.from_defaults(token_limit=3000)
            self.chat_engine = self.index.as_chat_engine(
                chat_mode="condense_plus_context",
                memory=self.memory,
                verbose=False
            )
            self.source_type = source_type
            self.source_name = source_name

            return True, f"Successfully indexed '{source_name}' ({len(documents)} parts loaded)."
        except Exception as e:
            return False, f"Failed to build vector index: {str(e)}"

    def index_url(self, url: str) -> Tuple[bool, str]:
        """Scrape and index a webpage URL."""
        try:
            docs = load_web_url(url)
            return self._build_index(docs, source_type="url", source_name=url)
        except Exception as e:
            return False, f"Failed to index URL: {str(e)}"

    def index_file(self, temp_file_path: str, filename: str) -> Tuple[bool, str]:
        """Load and index a PDF or TXT file."""
        try:
            ext = os.path.splitext(filename)[1].lower()
            if ext == ".pdf":
                docs = load_pdf_file(temp_file_path, filename=filename)
            elif ext in [".txt", ".md", ".log", ".csv", ".json"]:
                docs = load_txt_file(temp_file_path, filename=filename)
            else:
                return False, f"Unsupported file type: {ext}. Please upload a PDF or TXT file."

            return self._build_index(docs, source_type="file", source_name=filename)
        except Exception as e:
            return False, f"Failed to index file: {str(e)}"

    def chat(self, question: str) -> str:
        """Query the active index with conversational memory."""
        if not self.chat_engine:
            raise ValueError("No document or webpage has been indexed yet. Please upload a file or enter a URL first.")

        response = self.chat_engine.chat(question)
        return str(response)

    def query(self, question: str) -> str:
        """Alias to chat() for backwards compatibility."""
        return self.chat(question)

    def reset_chat(self) -> None:
        """Clear conversation memory buffer."""
        if self.memory:
            self.memory.reset()

    def get_status(self) -> dict:
        """Return the current indexing status."""
        return {
            "is_indexed": self.chat_engine is not None,
            "source_type": self.source_type,
            "source_name": self.source_name
        }

# Singleton instance to hold state across HTTP requests
rag_engine = RAGEngine()
