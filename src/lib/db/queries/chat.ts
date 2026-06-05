import { query } from "../client";
import type { ChatSession, ChatMessage, SourceReference } from "@/types";

export async function createSession(
  userId: string,
  title: string
): Promise<ChatSession> {
  const result = await query<ChatSession>(
    `INSERT INTO chat_sessions (user_id, title)
     VALUES ($1, $2)
     RETURNING id, user_id, title, created_at`,
    [userId, title]
  );
  return result.rows[0];
}

export async function insertMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  sources: SourceReference[] | null
): Promise<void> {
  // The sources column is JSONB. node-postgres turns a JS array into a Postgres
  // array literal, so serialise it ourselves and bind it as jsonb text.
  await query(
    `INSERT INTO chat_messages (session_id, role, content, sources)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [sessionId, role, content, sources ? JSON.stringify(sources) : null]
  );
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const result = await query<ChatSession>(
    `SELECT id, user_id, title, created_at
     FROM chat_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Returns the session only if it belongs to the given user, so callers can
// enforce ownership before reading or mutating it.
export async function getSessionForUser(
  sessionId: string,
  userId: string
): Promise<ChatSession | null> {
  const result = await query<ChatSession>(
    `SELECT id, user_id, title, created_at
     FROM chat_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] ?? null;
}

export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const result = await query<ChatMessage>(
    `SELECT id, session_id, role, content, sources, created_at
     FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<void> {
  // messages are removed via ON DELETE CASCADE.
  await query("DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2", [
    sessionId,
    userId,
  ]);
}
