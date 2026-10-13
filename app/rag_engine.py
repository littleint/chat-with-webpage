import requests
import html2text
from typing import Optional, Tuple
from llama_index.core import VectorStoreIndex, Document

class RAGEngine:
    """Manages web scraping, document indexing, and querying."""
    
    def __init__(self):
        self.current_url: Optional[str] = None
        self.current_title: Optional[str] = None
        self.index: Optional[VectorStoreIndex] = None
        self.query_engine = None

    def scrape_webpage(self, url: str) -> str:
        """Fetch webpage HTML with browser headers and convert to clean text."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=25)
        response.raise_for_status()

        # Convert HTML to Markdown text
        text_maker = html2text.HTML2Text()
        text_maker.ignore_links = True
        text_maker.ignore_images = True
        markdown_text = text_maker.handle(response.text)

        # Slice to first 45,000 characters for fast CPU embedding and reasoning
        return markdown_text[:45000]

    def index_url(self, url: str) -> Tuple[bool, str]:
        """Scrape and index a new webpage URL into memory."""
        try:
            print(f"Scraping {url}...", flush=True)
            clean_text = self.scrape_webpage(url)

            if not clean_text or len(clean_text.strip()) < 50:
                return False, "Could not extract readable text from the provided URL."

            doc = Document(text=clean_text, metadata={"url": url})
            
            print("Building vector index...", flush=True)
            self.index = VectorStoreIndex.from_documents([doc])
            self.query_engine = self.index.as_query_engine()
            self.current_url = url

            return True, f"Successfully indexed page ({len(clean_text)} characters loaded)."
        except Exception as e:
            return False, f"Failed to index URL: {str(e)}"

    def query(self, question: str) -> str:
        """Query the currently loaded webpage."""
        if not self.query_engine:
            raise ValueError("No webpage has been indexed yet. Please index a URL first.")

        response = self.query_engine.query(question)
        return str(response)

    def get_status(self) -> dict:
        """Return the current indexing status."""
        return {
            "is_indexed": self.query_engine is not None,
            "current_url": self.current_url
        }

# Singleton instance to hold state across HTTP requests
rag_engine = RAGEngine()
