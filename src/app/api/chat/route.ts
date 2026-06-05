import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { requireAuth, unauthorizedResponse } from "@/lib/auth/guards";
import { SYSTEM_PROMPT } from "@/lib/context/hardcoded";
import { retrieveContext } from "@/lib/retrieval";
import { createSession, insertMessage } from "@/lib/db/queries/chat";
import type { SourceReference } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Use the first question as the session's title, trimmed to a sensible length
// for the history sidebar.
function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { messages, sessionId }: { messages: ChatMessage[]; sessionId: string | null } =
    await req.json();

  // Retrieve document context relevant to the user's latest question and
  // inject it into the system prompt. If nothing relevant is found, fall
  // back to the persona prompt alone.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const { context, sources } = lastUserMessage
    ? await retrieveContext(lastUserMessage.content)
    : { context: "", sources: [] as SourceReference[] };

  // Persist the conversation. Start a new session on the first message, then
  // store the user's turn now and the assistant's turn once it finishes.
  let resolvedSessionId = sessionId;
  if (lastUserMessage) {
    if (!resolvedSessionId) {
      const created = await createSession(session.sub, deriveTitle(lastUserMessage.content));
      resolvedSessionId = created.id;
    }
    await insertMessage(resolvedSessionId, "user", lastUserMessage.content, null);
  }

  const system = context
    ? `${SYSTEM_PROMPT}\n\n## Relevant material from our documents\nUse the following retrieved material to answer when it is relevant. If it does not cover the question, answer from your general knowledge of the faith.\n\n${context}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    messages,
    onFinish: async ({ text }) => {
      if (resolvedSessionId) {
        await insertMessage(
          resolvedSessionId,
          "assistant",
          text,
          sources.length > 0 ? sources : null
        );
      }
    },
  });

  // Hand the client the session id (for the first turn) and the citations for
  // this answer via headers, URL-encoded so any unicode in titles stays safe.
  return result.toTextStreamResponse({
    headers: {
      "x-session-id": resolvedSessionId ?? "",
      "x-sources": encodeURIComponent(JSON.stringify(sources)),
    },
  });
}
