import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// BGE-small-en-v1.5 outputs 384-dimensional vectors, matching the
// chunks.embedding column (vector(384)) in the schema.
const MODEL = "Xenova/bge-small-en-v1.5";

// The model is ~130MB and slow to load, so we load it once and reuse it.
// The first call downloads the model to the HF cache (HF_HOME); later calls
// are fast. We cache the promise so concurrent callers share one load.
let _pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!_pipelinePromise) {
    _pipelinePromise = pipeline("feature-extraction", MODEL);
  }
  return _pipelinePromise;
}

/**
 * Turn a piece of text into a 384-dimensional embedding vector.
 * Uses mean pooling + normalization, which is what BGE expects for
 * cosine-similarity search.
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
