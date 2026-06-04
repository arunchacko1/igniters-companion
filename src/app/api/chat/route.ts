import { streamText } from "ai";
import { google } from "@ai-sdk/google";
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
    model: google("gemini-1.5-flash"),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toTextStreamResponse();
}
