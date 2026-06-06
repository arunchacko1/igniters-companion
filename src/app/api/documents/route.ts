import { requireLeader, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/guards";
import { createDocument, listDocuments, setDocumentStatus } from "@/lib/db/queries/documents";
import { ingestDocument } from "@/lib/ingest";
import { extractPdfText } from "@/lib/ingest/pdf";
import type { JwtPayload } from "@/types";

const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

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
    return Response.json({ error: "Only .txt, .md, and .pdf files are supported" }, { status: 400 });
  }

  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const text = isPdf ? await extractPdfText(await file.arrayBuffer()) : await file.text();
  if (!text.trim()) {
    // A PDF with no extractable text is almost always a scanned/image-only file,
    // which would need OCR. Tell the leader rather than failing silently.
    return Response.json(
      {
        error: isPdf
          ? "No text could be extracted. Scanned or image-only PDFs aren't supported."
          : "File is empty",
      },
      { status: 400 }
    );
  }

  const title = file.name.replace(/\.(txt|md|pdf)$/i, "");
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
