import { query } from "../client";

export interface ChunkSearchResult {
  id: string;
  content: string;
  document_id: string;
  document_title: string;
  similarity: number;
}

// pgvector accepts a vector as a string literal like "[0.1,0.2,...]".
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function insertChunk(
  documentId: string,
  content: string,
  embedding: number[]
): Promise<void> {
  await query(
    `INSERT INTO chunks (document_id, content, embedding)
     VALUES ($1, $2, $3::vector)`,
    [documentId, content, toVectorLiteral(embedding)]
  );
}

/**
 * Find the chunks whose embeddings are most similar to the query embedding,
 * using pgvector cosine distance (<=>). Returns a similarity score in [0,1]
 * where 1 means identical.
 */
export async function searchChunks(
  embedding: number[],
  limit = 4
): Promise<ChunkSearchResult[]> {
  const result = await query<ChunkSearchResult>(
    `SELECT c.id, c.content, c.document_id,
            d.title AS document_title,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE c.embedding IS NOT NULL
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [toVectorLiteral(embedding), limit]
  );
  return result.rows;
}
