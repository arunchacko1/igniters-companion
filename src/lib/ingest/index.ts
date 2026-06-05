import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embed } from "../embeddings";
import { insertChunk } from "../db/queries/chunks";

// Split documents into overlapping ~1000-character chunks. The overlap keeps
// sentences that straddle a boundary retrievable from either chunk.
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Chunk a document's text, embed each chunk, and store the chunks against the
 * given document id. Returns the number of chunks created.
 */
export async function ingestDocument(documentId: string, text: string): Promise<number> {
  const chunks = await splitter.splitText(text);
  for (const chunk of chunks) {
    const embedding = await embed(chunk);
    await insertChunk(documentId, chunk, embedding);
  }
  return chunks.length;
}
