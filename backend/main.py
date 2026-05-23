from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os, shutil, json
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# ── App setup ──────────────────────────────────────────────
app = FastAPI(
    title="📄 RAG PDF Chatbot API",
    description="Upload a PDF and chat with its content using LangChain + Ollama + FAISS.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ────────────────────────────────────────────
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

vectorstore = None
current_pdf = None
qa_chain    = None

# ── Prompt template ─────────────────────────────────────────
PROMPT_TEMPLATE = """You are a helpful assistant that answers questions based on the provided document context.
Use only the information from the context to answer. If you don't know, say "I don't find this information in the document."

Context:
{context}

Question: {question}

Answer:"""

prompt = PromptTemplate(
    template=PROMPT_TEMPLATE,
    input_variables=["context", "question"]
)

# ── Request models ──────────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str

# ── Routes ──────────────────────────────────────────────────
@app.get("/", tags=["General"])
def root():
    return {
        "message": "📄 RAG PDF Chatbot API",
        "docs": "/docs",
        "endpoints": {
            "upload_pdf": "POST /upload",
            "ask_question": "POST /ask",
            "current_pdf": "GET /status",
        }
    }

@app.get("/status", tags=["General"])
def status():
    return {
        "pdf_loaded": current_pdf is not None,
        "current_pdf": current_pdf,
        "ready_to_chat": qa_chain is not None,
    }

@app.post("/upload", tags=["PDF"])
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and process it for RAG."""
    global vectorstore, current_pdf, qa_chain

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")

    # Save PDF
    pdf_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(pdf_path, "wb") as f:
        f.write(contents)

    try:
        # Load and split PDF
        print(f"Loading PDF: {file.filename}")
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        chunks = splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks from {len(documents)} pages")

        # Create embeddings and vector store
        print("Creating embeddings...")
        embeddings = OllamaEmbeddings(model="mistral")
        vectorstore = FAISS.from_documents(chunks, embeddings)

        # Create QA chain
        llm = Ollama(model="mistral", temperature=0.1)
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=True,
        )

        current_pdf = file.filename

        return JSONResponse({
            "success": True,
            "filename": file.filename,
            "pages": len(documents),
            "chunks": len(chunks),
            "message": f"PDF processed! {len(chunks)} chunks created. Ready to chat!",
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.post("/ask", tags=["Chat"])
async def ask_question(request: QuestionRequest):
    """Ask a question about the uploaded PDF."""
    global qa_chain, current_pdf

    if qa_chain is None:
        raise HTTPException(
            status_code=400,
            detail="No PDF loaded. Please upload a PDF first via POST /upload"
        )

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        print(f"Question: {request.question}")
        result = qa_chain({"query": request.question})

        answer = result.get("result", "No answer found.")
        source_docs = result.get("source_documents", [])

        # Extract source pages
        sources = []
        for doc in source_docs:
            page = doc.metadata.get("page", "?")
            if page not in sources:
                sources.append(page + 1 if isinstance(page, int) else page)

        return JSONResponse({
            "success": True,
            "question": request.question,
            "answer": answer,
            "source_pages": sources[:3],
            "pdf": current_pdf,
            "model": "mistral (Ollama)",
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")


@app.delete("/reset", tags=["General"])
def reset():
    """Reset the chatbot — clear loaded PDF and vector store."""
    global vectorstore, current_pdf, qa_chain
    vectorstore = None
    current_pdf = None
    qa_chain    = None
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR)
    return {"success": True, "message": "Chatbot reset. Upload a new PDF to start."}
