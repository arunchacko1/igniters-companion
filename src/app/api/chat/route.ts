import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";
import { requireAuth, unauthorizedResponse } from "@/lib/auth/guards";
import { SYSTEM_PROMPT } from "@/lib/context/hardcoded";

export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { messages } = await req.json();

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toTextStreamResponse();
}
