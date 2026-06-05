import { requireAuth, unauthorizedResponse } from "@/lib/auth/guards";
import {
  getSessionForUser,
  getSessionMessages,
  deleteSession,
} from "@/lib/db/queries/chat";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const chatSession = await getSessionForUser(id, session.sub);
  if (!chatSession) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await getSessionMessages(id);
  return Response.json({ session: chatSession, messages });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  await deleteSession(id, session.sub);
  return Response.json({ ok: true });
}
