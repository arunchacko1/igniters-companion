import { query } from "../client";
import type { Document } from "@/types";

export interface DocumentListItem extends Document {
  chunk_count: number;
}

export async function createDocument(
  title: string,
  sourceKey: string,
  mimeType: string,
  uploadedBy: string
): Promise<Document> {
  const result = await query<Document>(
    `INSERT INTO documents (title, source_key, mime_type, uploaded_by, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING id, title, source_key, mime_type, uploaded_by, status, created_at`,
    [title, sourceKey, mimeType, uploadedBy]
  );
  return result.rows[0];
}

export async function setDocumentStatus(
  id: string,
  status: Document["status"]
): Promise<void> {
  await query("UPDATE documents SET status = $2 WHERE id = $1", [id, status]);
}

export async function listDocuments(): Promise<DocumentListItem[]> {
  const result = await query<DocumentListItem>(
    `SELECT d.id, d.title, d.source_key, d.mime_type, d.uploaded_by,
            d.status, d.created_at,
            COUNT(c.id)::int AS chunk_count
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC`
  );
  return result.rows;
}

export async function deleteDocument(id: string): Promise<void> {
  // chunks are removed automatically via ON DELETE CASCADE.
  await query("DELETE FROM documents WHERE id = $1", [id]);
}
