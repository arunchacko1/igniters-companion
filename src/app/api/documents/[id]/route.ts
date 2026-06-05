import { requireLeader, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/guards";
import { deleteDocument } from "@/lib/db/queries/documents";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireLeader();
  } catch (err) {
    return err instanceof Error && err.message === "FORBIDDEN"
      ? forbiddenResponse()
      : unauthorizedResponse();
  }

  const { id } = await params;
  await deleteDocument(id);
  return Response.json({ ok: true });
}
