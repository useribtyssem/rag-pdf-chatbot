import { useState, useRef, useEffect } from "react";

const API = "http://127.0.0.1:8000";

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

export default function App() {
  const [pdf, setPdf] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const chatRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setPdf(file);
    setError(null);
    setMessages([]);
    setPdfInfo(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setPdfInfo(data);
      setMessages([{
        role: "assistant",
        text: `✅ **${data.filename}** loaded successfully!\n\n📄 **${data.pages} pages** · **${data.chunks} chunks** created\n\nAsk me anything about this document!`,
        time: new Date().toLocaleTimeString(),
      }]);
    } catch (e) {
      setError(e.message.includes("fetch") ? "Cannot connect to API. Make sure uvicorn is running." : e.message);
      setPdf(null);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question, time: new Date().toLocaleTimeString() }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      const pages = data.source_pages?.length > 0
        ? `\n\n*Sources: pages ${data.source_pages.join(", ")}*`
        : "";
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.answer + pages,
        time: new Date().toLocaleTimeString(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "⚠️ " + (e.message.includes("fetch") ? "Cannot connect to API." : e.message),
        time: new Date().toLocaleTimeString(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const reset = async () => {
    await fetch(`${API}/reset`, { method: "DELETE" }).catch(() => {});
    setPdf(null); setPdfInfo(null);
    setMessages([]); setError(null);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f13",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#e2e8f0", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a2e; }
        ::-webkit-scrollbar-thumb { background: #4a4a6a; border-radius: 2px; }
        .btn { border: none; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .upload-area { border: 1.5px dashed #2d2d4a; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(99,102,241,0.03); }
        .upload-area:hover, .upload-area.drag { border-color: #6366f1; background: rgba(99,102,241,0.06); }
        .msg-user { background: #6366f1; color: white; border-radius: 18px 18px 4px 18px; margin-left: auto; }
        .msg-assistant { background: #1e1e2e; border: 1px solid #2d2d4a; border-radius: 18px 18px 18px 4px; }
        .msg-error { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .typing span { display:inline-block; width:6px; height:6px; border-radius:50%; background:#6366f1; margin:0 2px; animation: bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-6px) } }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        pre { white-space: pre-wrap; word-break: break-word; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileIcon />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>RAG PDF Chatbot</h1>
            <p style={{ fontSize: 11, color: "#4a4a6a" }}>LangChain · Ollama · FAISS</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pdfInfo && (
            <span style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(99,102,241,0.2)" }}>
              {pdfInfo.filename}
            </span>
          )}
          {pdf && (
            <button className="btn" onClick={reset} style={{ fontSize: 12, color: "#94a3b8", padding: "4px 10px", background: "#1e1e2e", borderRadius: 6, border: "1px solid #2d2d4a" }}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", maxWidth: 800, margin: "0 auto", width: "100%", padding: "1.5rem", gap: "1rem", flexDirection: "column" }}>

        {/* Upload zone */}
        {!pdf && (
          <div
            className={`upload-area ${dragging ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              {dragging ? "Drop your PDF here" : "Upload a PDF to start chatting"}
            </p>
            <p style={{ fontSize: 12, color: "#4a4a6a", marginBottom: 16 }}>Drag & drop or click to browse · Max 50MB</p>
            <button className="btn" style={{ background: "#6366f1", color: "white", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
              Browse PDF
            </button>
          </div>
        )}

        {/* Uploading state */}
        {uploading && (
          <div style={{ textAlign: "center", padding: "2rem", background: "#1e1e2e", borderRadius: 12, border: "1px solid #2d2d4a" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }} className="pulse">⚙️</div>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>Processing PDF...</p>
            <p style={{ fontSize: 12, color: "#4a4a6a" }}>Creating embeddings with Ollama</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, maxHeight: "50vh", paddingRight: 4 }}>
            {messages.map((msg, i) => (
              <div key={i} className="fade-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div className={`msg-${msg.role} ${msg.error ? "msg-error" : ""}`} style={{ maxWidth: "80%", padding: "12px 16px", fontSize: 14, lineHeight: 1.6 }}>
                  <pre style={{ fontFamily: "inherit" }}>{msg.text}</pre>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div className="msg-assistant" style={{ padding: "14px 18px" }}>
                  <div className="typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {pdfInfo && (
          <div style={{ display: "flex", gap: 8, background: "#1e1e2e", border: "1px solid #2d2d4a", borderRadius: 12, padding: "8px 8px 8px 16px", marginTop: "auto" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
              placeholder="Ask anything about the PDF..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "#e2e8f0", fontFamily: "inherit" }}
            />
            <button
              className="btn"
              onClick={handleAsk}
              disabled={!input.trim() || loading}
              style={{ background: "#6366f1", color: "white", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <SendIcon />
            </button>
          </div>
        )}

        {/* Suggested questions */}
        {pdfInfo && messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Summarize this document", "What are the main topics?", "What are the key conclusions?"].map((q) => (
              <button key={q} className="btn" onClick={() => { setInput(q); inputRef.current?.focus(); }}
                style={{ fontSize: 12, color: "#6366f1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", padding: "6px 12px", borderRadius: 99 }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "1rem", borderTop: "1px solid #1e1e2e", fontSize: 11, color: "#2d2d4a" }}>
        built by Ibtissem Ben Hamed · LangChain · Ollama (Mistral) · FAISS
      </div>
    </div>
  );
}
