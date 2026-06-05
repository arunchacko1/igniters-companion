FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Download the embeddings model so it can be baked into the image. transformers.js
# caches it under node_modules/@huggingface/transformers/.cache.
RUN node scripts/prefetch-model.mjs

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Next's standalone tracing drops onnxruntime-node's native .so and the baked
# model cache, so overlay the full packages from the builder. @huggingface/
# transformers carries the prefetched model in its .cache directory.
COPY --from=builder /app/node_modules/@huggingface/transformers ./node_modules/@huggingface/transformers
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
RUN chown -R nextjs:nodejs ./node_modules/@huggingface/transformers ./node_modules/onnxruntime-node

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Bind to all interfaces. Docker otherwise sets HOSTNAME to the container id and
# the standalone server binds only to that, leaving localhost unreachable inside
# the container (which breaks the healthcheck).
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
