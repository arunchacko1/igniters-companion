import { requireLeader, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/guards";
import { createDocument, listDocuments, setDocumentStatus } from "@/lib/db/queries/documents";
import { ingestDocument } from "@/lib/ingest";
import type { JwtPayload } from "@/types";

const ALLOWED_EXTENSIONS = [".txt", ".md"];

// Map a guard error to the right HTTP response (403 for a logged-in non-leader,
// 401 otherwise). Returns null when the caller is a leader.
function guardError(err: unknown): Response {
  return err instanceof Error && err.message === "FORBIDDEN"
    ? forbiddenResponse()
    : unauthorizedResponse();
}

export async function GET() {
  try {
    await requireLeader();
  } catch (err) {
    return guardError(err);
  }

  const documents = await listDocuments();
  return Response.json({ documents });
}

export async function POST(req: Request) {
  let session: JwtPayload;
  try {
    session = await requireLeader();
  } catch (err) {
    return guardError(err);
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return Response.json({ error: "Only .txt and .md files are supported" }, { status: 400 });
  }

  const text = await file.text();
  if (!text.trim()) {
    return Response.json({ error: "File is empty" }, { status: 400 });
  }

  const title = file.name.replace(/\.(txt|md)$/i, "");
  const doc = await createDocument(
    title,
    `upload:${file.name}`,
    file.type || "text/plain",
    session.sub
  );

  try {
    const chunkCount = await ingestDocument(doc.id, text);
    await setDocumentStatus(doc.id, "ready");
    return Response.json(
      { document: { ...doc, status: "ready", chunk_count: chunkCount } },
      { status: 201 }
    );
  } catch {
    await setDocumentStatus(doc.id, "error");
    return Response.json({ error: "Failed to process document" }, { status: 500 });
  }
}
