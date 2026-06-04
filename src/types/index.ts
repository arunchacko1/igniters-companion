export type UserRole = "leader" | "member";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface Document {
  id: string;
  title: string;
  source_key: string;
  mime_type: string;
  uploaded_by: string;
  status: "processing" | "ready" | "error";
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceReference[] | null;
  created_at: string;
}

export interface SourceReference {
  chunk_id: string;
  document_title: string;
  similarity: number;
}
