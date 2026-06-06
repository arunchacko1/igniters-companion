import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract the text layer from a PDF. Returns the concatenated text of every
 * page. PDFs without a text layer (scanned/image-only) yield an empty or
 * near-empty string — the caller treats that as an empty document and rejects
 * it, since extracting text from images would require OCR.
 */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
