import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { requireAuth, unauthorizedResponse } from "@/lib/auth/guards";
import { SYSTEM_PROMPT } from "@/lib/context/hardcoded";
import { retrieveContext } from "@/lib/retrieval";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { messages }: { messages: ChatMessage[] } = await req.json();

  // Retrieve document context relevant to the user's latest question and
  // inject it into the system prompt. If nothing relevant is found, fall
  // back to the persona prompt alone.
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const { context } = lastUserMessage
    ? await retrieveContext(lastUserMessage.content)
    : { context: "" };

  const system = context
    ? `${SYSTEM_PROMPT}\n\n## Relevant material from our documents\nUse the following retrieved material to answer when it is relevant. If it does not cover the question, answer from your general knowledge of the faith.\n\n${context}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    messages,
  });

  return result.toTextStreamResponse();
}
