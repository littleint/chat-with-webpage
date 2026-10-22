import os
import sys
import requests
import html2text
from dotenv import load_dotenv

# Ensure Windows terminal can print unicode characters (like hyphens, emojis, symbols)
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from llama_index.core import VectorStoreIndex, Settings, Document
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

load_dotenv()

# 1. Configure Groq as the LLM (using the model available on your Groq key)
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("Warning: GROQ_API_KEY is not set in your .env file!")

Settings.llm = Groq(
    model="openai/gpt-oss-120b",
    api_key=groq_api_key
)

# 2. Configure a free local Hugging Face model for embeddings
Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")


def load_webpage(url: str) -> list[Document]:
    """Fetch webpage content with browser headers so sites like Wikipedia don't block requests."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    # Convert HTML to clean readable Markdown text
    text_maker = html2text.HTML2Text()
    text_maker.ignore_links = True
    text_maker.ignore_images = True
    clean_text = text_maker.handle(response.text)
    # Use first 40,000 chars for fast CPU embedding & response
    clean_text = clean_text[:40000]
    
    return [Document(text=clean_text, metadata={"url": url})]


def main(url: str) -> None:
    print(f"1. Loading webpage content from: {url}", flush=True)
    documents = load_webpage(url)
    
    print("2. Generating embeddings and index (weights loaded into RAM once)...", flush=True)
    index = VectorStoreIndex.from_documents(documents=documents)
    
    query_engine = index.as_query_engine()
    
    print("\n" + "="*50)
    print("  Ready! Ask any question about this webpage.")
    print("  (Type 'exit' or 'quit' to stop)")
    print("="*50 + "\n")
    
    while True:
        try:
            user_query = input("\nYou: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Goodbye!")
            break

        if not user_query:
            continue

        if user_query.lower() in ["exit", "quit", "q"]:
            print("Exiting. Goodbye!")
            break

        print("\nThinking with Groq...", flush=True)
        response = query_engine.query(user_query)
        print(f"\nGroq:\n{response}")


if __name__ == "__main__":
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://en.wikipedia.org/wiki/India"
    main(url=target_url)
