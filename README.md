# 📄 RAG PDF Chatbot

> Chat with any PDF document using **Retrieval-Augmented Generation (RAG)** powered by **LangChain**, **Ollama (Mistral)**, and **FAISS** vector store.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.2-1C3C3C?logo=langchain&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Mistral_7B-black?logo=ollama&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🎯 What it does

Upload any PDF and ask questions about its content. The app:

1. **Loads** the PDF and splits it into chunks
2. **Embeds** each chunk using Ollama (Mistral)
3. **Stores** embeddings in a FAISS vector database
4. **Retrieves** the most relevant chunks for each question
5. **Generates** a precise answer using the Mistral LLM

Everything runs **locally** — no API keys, no data sent to the cloud.

---

##Demo

![Demo](assets/demo.png)

---

## 🗂️ Project Structure

```
rag-pdf-chatbot/
├── backend/
│   ├── main.py              ← FastAPI REST API
│   └── requirements.txt     ← Python dependencies
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx          ← React UI
│       └── main.jsx
├── assets/
│   └── demo.png
└── README.md
```

---

## Architecture

```
User uploads PDF
      ↓
PyPDFLoader → splits into chunks (1000 chars, 200 overlap)
      ↓
OllamaEmbeddings (Mistral) → creates vector embeddings
      ↓
FAISS vector store → stores and indexes embeddings
      ↓
User asks a question
      ↓
FAISS retriever → finds top 4 most relevant chunks
      ↓
Mistral LLM → generates answer from context
      ↓
FastAPI → returns answer + source pages
      ↓
React UI → displays result
```

---

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) installed

### 1. Install Ollama and pull Mistral

```bash
# Download Ollama from https://ollama.com
ollama pull mistral
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info |
| `GET` | `/status` | Check if PDF is loaded |
| `POST` | `/upload` | Upload and process a PDF |
| `POST` | `/ask` | Ask a question about the PDF |
| `DELETE` | `/reset` | Reset and clear loaded PDF |

### Example

```bash
# Upload PDF
curl -X POST http://localhost:8000/upload -F "file=@document.pdf"

# Ask question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main conclusions?"}'
```

### Response example

```json
{
  "success": true,
  "question": "What are the main conclusions?",
  "answer": "The main conclusions are...",
  "source_pages": [3, 5, 7],
  "pdf": "document.pdf",
  "model": "mistral (Ollama)"
}
```

---

## Tech Stack

| Category | Tools |
|----------|-------|
| LLM | Ollama — Mistral 7B (local) |
| RAG Framework | LangChain 0.2 |
| Vector Store | FAISS (Facebook AI) |
| Embeddings | Ollama Embeddings |
| PDF Parsing | PyPDF |
| Backend | FastAPI + Uvicorn |
| Frontend | React 18 + Vite |
| Styling | CSS-in-JS |

---

##  Features

- **100% local** — no data sent to external servers
- **Any PDF** — works with research papers, books, reports
- **Source pages** — shows which pages the answer comes from
- **Suggested questions** — quick start prompts
- **Reset** — load a new PDF anytime

---

## Author

**Ibtissem Ben Hamed** — Computer Science & Multimedia, AI/ML Engineer  
📧 ibtissembenhamed00@gmail.com  
🔗 [LinkedIn](https://linkedin.com/in/ibtissem-benhamed)  
🐙 [GitHub](https://github.com/useribtyssem)

---

## License

MIT License — see [LICENSE](LICENSE) for details.
