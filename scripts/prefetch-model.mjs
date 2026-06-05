// Pre-download the embeddings model at image build time so it is baked into
// the container image. Without this the ~130MB model would be fetched from
// Hugging Face on the first chat/upload request — slow, and a runtime
// dependency on an external service. Baking it in keeps cold starts fast and
// the running container self-contained.
//
// transformers.js caches into node_modules/@huggingface/transformers/.cache;
// the Dockerfile copies that directory into the final image.
import { pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/bge-small-en-v1.5";

const extractor = await pipeline("feature-extraction", MODEL);
await extractor("warm up the model cache", { pooling: "mean", normalize: true });

console.log(`Cached ${MODEL}`);
