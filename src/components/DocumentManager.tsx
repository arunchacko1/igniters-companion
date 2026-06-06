"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

interface DocumentItem {
  id: string;
  title: string;
  status: "processing" | "ready" | "error";
  chunk_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<DocumentItem["status"], string> = {
  ready: "bg-green-100 text-green-700",
  processing: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

export default function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });

    if (res.ok) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-8">
      {/* Upload */}
      <form
        onSubmit={handleUpload}
        className="bg-white border border-slate-200 rounded-xl p-5 mb-8"
      >
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Upload a document</h2>
        <p className="text-xs text-slate-500 mb-4">
          Text, Markdown, or PDF (.txt, .md, .pdf). It will be chunked and embedded for search.
          PDFs must have a text layer — scanned or image-only files aren&apos;t supported.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            className="flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-200"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Processing…" : "Upload"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </form>

      {/* List */}
      <h2 className="text-sm font-semibold text-slate-800 mb-3">
        Documents {documents.length > 0 && `(${documents.length})`}
      </h2>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-slate-400">No documents yet. Upload one above.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                <p className="text-xs text-slate-500">
                  {doc.chunk_count} chunk{doc.chunk_count === 1 ? "" : "s"} ·{" "}
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[doc.status]}`}
                >
                  {doc.status}
                </span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
