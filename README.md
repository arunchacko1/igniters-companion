---
title: Igniters Companion
emoji: 🔥
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 3000
pinned: false
---

# Igniters Companion

A RAG-powered faith-formation assistant for the Igniters Catholic youth ministry. Leaders and members can ask questions about Catholic teaching, Syro-Malabar tradition, and group materials — answers are grounded in uploaded documents and include citations.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js runtime)
- **Database:** PostgreSQL 16 with pgvector — single DB for relational data and vector embeddings
- **Embeddings:** BGE-small-en-v1.5 via Hugging Face Transformers.js (runs locally, no API key)
- **Generation:** Llama 3.3 70B via Groq (Vercel AI SDK), streamed to the frontend
- **RAG orchestration:** LangChain.js (document loaders, text splitters)
- **Infrastructure:** Docker + docker-compose for local dev; AWS EC2 + RDS Postgres for production, image built and deployed via GitHub Actions

## Roles

| Role | Capabilities |
|------|-------------|
| Member | Chat with the assistant |
| Leader | Chat + upload/manage source documents |

## Local development

### Prerequisites

- Node.js 20+
- Docker + docker-compose

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in secrets
cp .env.example .env.local

# Start Postgres with pgvector
docker compose up db -d

# Run database migrations
npm run migrate

# Verify your Groq API key is working (optional but recommended)
npm run check:ai

# Seed a few sample documents so the assistant has material to cite
npm run seed

# Start dev server
npm run dev
```

> Get a free Groq API key (no credit card) at [console.groq.com/keys](https://console.groq.com/keys) and set `GROQ_API_KEY` in `.env.local`.

Open [http://localhost:3000](http://localhost:3000).

### Running with Docker

```bash
docker compose up --build
```

## Project structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # React components
├── lib/
│   ├── db/        # PostgreSQL client and query functions
│   ├── auth/      # JWT session helpers and route guards
│   ├── embeddings/# Transformers.js embedding pipeline
│   ├── ingest/    # Document ingestion pipeline
│   └── retrieval/ # Vector search and context assembly
└── types/         # Shared TypeScript types
scripts/
├── migrate.ts     # Run database schema migrations
├── seed.ts        # Seed sample documents for local RAG testing
└── check-ai.ts    # Preflight check for the Groq API key
```

## Build phases

1. ✅ **Foundation** — auth, role-based routing, DB schema
2. ✅ **Streaming chat** — Groq/Llama integration with hardcoded context
3. ✅ **RAG retrieval** — local embeddings + pgvector similarity search
4. ✅ **Ingestion pipeline** — document upload, chunking, admin dashboard
5. ✅ **Citations + history** — source attribution, session persistence
6. ✅ **AWS deployment** — EC2 + RDS, Docker, GitHub Actions CI/CD
