# LlamaReader - Webpage RAG Assistant

A fast, interactive Retrieval-Augmented Generation (RAG) web application powered by **LlamaIndex**, **Groq LLM**, and **FastAPI**.

Extract text from any public webpage, index it into a vector store in memory, and ask questions to get context-grounded answers with low latency.

---

## 🚀 Features

- **Live Web Scraping**: Clean text extraction using `requests` and `html2text`.
- **In-Memory Vector Search**: Documents are embedded and indexed via LlamaIndex (`VectorStoreIndex`).
- **Interactive UI**: Clean, responsive web interface for indexing URLs and chatting with web pages.
- **FastAPI Backend**: Asynchronous REST endpoints for page indexing and querying.

---

## 🛠️ Tech Stack

- **Framework**: FastAPI, Uvicorn
- **RAG & Orchestration**: LlamaIndex (`llama-index-llms-groq`, `llama-index-embeddings-huggingface`)
- **Scraping / Parsing**: Requests, HTML2Text
- **Frontend**: Vanilla HTML5, CSS3, JavaScript

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/llamaindex-web-rag.git
cd llamaindex-web-rag
```

### 2. Create and activate a virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 5. Run the application
```bash
python run.py
```

The app will open automatically at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 📂 Project Structure

```text
├── app/
│   ├── main.py          # FastAPI application routes
│   └── rag_engine.py    # Scraping, indexing, and query engine logic
├── static/
│   ├── css/style.css    # UI styling
│   ├── js/app.js        # Client-side logic and API calls
│   └── index.html       # Web application interface
├── .env                 # API keys (ignored by git)
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python dependencies
├── run.py               # Application launcher
└── README.md            # Project documentation
```
