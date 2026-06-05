import { requireAuth, unauthorizedResponse } from "@/lib/auth/guards";
import { listSessions } from "@/lib/db/queries/chat";

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const sessions = await listSessions(session.sub);
  return Response.json({ sessions });
}
