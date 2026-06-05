"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import type { SourceReference } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceReference[];
}

interface SessionSummary {
  id: string;
  title: string | null;
  created_at: string;
}

interface Props {
  userEmail: string;
  role: "leader" | "member";
}

// Collapse the chunk-level citations down to the distinct documents an answer
// drew from — that's what's useful to show under a reply.
function uniqueTitles(sources: SourceReference[]): string[] {
  return [...new Set(sources.map((s) => s.document_title))];
}

export default function ChatInterface({ userEmail, role }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  function newChat() {
    setSessionId(null);
    setMessages([]);
    setError(null);
  }

  async function selectSession(id: string) {
    if (id === sessionId) return;
    setError(null);
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(
      data.messages.map((m: { id: string; role: Message["role"]; content: string; sources: SourceReference[] | null }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
      }))
    );
    setSessionId(id);
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === sessionId) newChat();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    const assistantId = crypto.randomUUID();
    const isFirstTurn = sessionId === null;

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? "Session expired. Please sign in again." : "Something went wrong.");
      }

      // The server tells us which session this belongs to (created on the first
      // turn) and which documents grounded the answer.
      const returnedSessionId = res.headers.get("x-session-id");
      if (returnedSessionId) setSessionId(returnedSessionId);

      let sources: SourceReference[] = [];
      const rawSources = res.headers.get("x-sources");
      if (rawSources) {
        try {
          sources = JSON.parse(decodeURIComponent(rawSources));
        } catch {
          sources = [];
        }
      }
      if (sources.length > 0) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
        );
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }

      // A brand-new session won't be in the sidebar yet — refresh the list.
      if (isFirstTurn) loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — session history */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={newChat}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-3">No past conversations.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  s.id === sessionId
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{s.title ?? "Untitled chat"}</span>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Delete conversation"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="text-3xl mb-3">✝️</div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">
                  Igniters Companion
                </h2>
                <p className="text-sm text-slate-500">
                  Ask me anything about the Catholic faith, Syro-Malabar
                  tradition, prayer, the sacraments, or our ministry.
                </p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] ${m.role === "user" ? "" : "w-full"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                  }`}
                >
                  {m.content || (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>

                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
                    <span className="text-xs text-slate-400">Sources:</span>
                    {uniqueTitles(m.sources).map((title) => (
                      <span
                        key={title}
                        className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex justify-center">
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the faith, sacraments, tradition…"
              disabled={streaming}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
