import { embed } from "../embeddings";
import { searchChunks } from "../db/queries/chunks";
import type { SourceReference } from "@/types";

const TOP_K = 4;
// Drop weak matches so we don't inject irrelevant material into the prompt.
const MIN_SIMILARITY = 0.4;

export interface RetrievalResult {
  context: string;
  sources: SourceReference[];
}

/**
 * Embed the user's question, find the most relevant document chunks via
 * pgvector similarity search, and assemble them into a context string that
 * can be injected into the system prompt.
 *
 * Returns an empty context when nothing relevant is found, so the caller can
 * fall back to answering from general knowledge.
 */
export async function retrieveContext(queryText: string): Promise<RetrievalResult> {
  const queryEmbedding = await embed(queryText);
  const chunks = await searchChunks(queryEmbedding, TOP_K);
  const relevant = chunks.filter((c) => c.similarity >= MIN_SIMILARITY);

  if (relevant.length === 0) {
    return { context: "", sources: [] };
  }

  const context = relevant
    .map((c, i) => `[${i + 1}] (from "${c.document_title}")\n${c.content}`)
    .join("\n\n");

  const sources: SourceReference[] = relevant.map((c) => ({
    chunk_id: c.id,
    document_title: c.document_title,
    similarity: c.similarity,
  }));

  return { context, sources };
}
