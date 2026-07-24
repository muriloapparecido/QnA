# Codebase Q&A Agent

A local RAG (Retrieval-Augmented Generation) system that lets you ask natural language questions about any codebase and get cited, file specific answers.

[![Demo Video](https://img.shields.io/badge/Watch%20Demo-Loom-purple?style=for-the-badge&logo=loom)](https://www.loom.com/share/1d0712dcf6334a5aa8ef4cd294c0c339)
<div>
    <a href="https://www.loom.com/share/1d0712dcf6334a5aa8ef4cd294c0c339">
      <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/1d0712dcf6334a5aa8ef4cd294c0c339-9c14c55b51c064b6-full-play.gif#t=0.1">
    </a>
  </div>

## What it does

Point it at a local repository, let it ingest the codebase, then ask questions like:

- *"Where is the keyword search function?"*
- *"How does authentication work?"*
- *"How does merge scoring work?"*

It returns answers citing the exact file and line numbers the answer came from.


## How it works

**Ingestion pipeline**
- Walks the repository file tree, filtering by configurable extensions and skip directories
- Chunks source files into overlapping 40-line segments with file path and line number metadata
- Embeds chunks using ChromaDB's default sentence transformer and stores them in a persistent local vector database

**Query pipeline**
- Rewrites the user's natural language question into a code-focused search query using GPT-4o-mini
- Runs **hybrid search**: semantic vector similarity in parallel with exact keyword matching on camelCase identifiers
- Merges results using a scoring system — chunks appearing in both searches rank higher
- Passes the top-ranked chunks to GPT-4o-mini as context and returns a cited answer

**Why hybrid search?**
Semantic search alone fails for exact code identifier lookups as function names like `handleIngest` have no natural language meaning that embeddings can bridge to. Adding keyword matching as a parallel path and boosting chunks found by both methods fixes this class of retrieval failure.


## Tech stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI |
| Vector DB | ChromaDB (local persistent) |
| LLM | OpenAI GPT-4o-mini |
| Frontend | React, TypeScript, Vite |
| Streaming | Server-Sent Events (SSE) |


## Features

- **Multi-repo support** — add multiple repositories and switch between isolated chat sessions
- **Real-time ingestion progress** — streaming progress bar with cancel support
- **Configurable ingestion** — adjust supported file extensions and skipped directories per session
- **Hybrid search** — semantic + keyword retrieval with score-based merging
- **Cited answers** — every response references the source file and line numbers
- **Query rewriting** — LLM-based rewriter converts natural language to code-search queries before retrieval


## Running locally

### Prerequisites

- Python 3.9+
- Node.js 18+
- OpenAI API key

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
OPENAI_API_KEY=your_key_here
```

Start the server:
```bash
fastapi dev main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, add a repository using its absolute path, and start asking questions.


## Project structure

```
QnA/
  backend/
    main.py          # FastAPI server — /ask and /ingest-stream endpoints
    ingestion.py     # File walking, chunking, ChromaDB upsert, streaming generator
    chroma_db/       # Local persistent vector database
  frontend/
    src/
      App.tsx
      api.ts         # Fetch wrappers for /ask and /ingest-stream
      hooks/
        useIngest.ts # Ingest state, streaming reader, abort controller
      components/
        Sidebar/     # Repo list, add/delete/re-ingest
        ChatMessage/ # Message rendering
        SettingsPanel/ # Supported extensions and skipped directories editing
        Ingest/      # Progress modal
      types/
        index.ts
```


## Design decisions

**Why not LangChain?**
Built from scratch intentionally with custom chunker, manual ChromaDB upsert batching, SSE streaming, and a from scratch hybrid search implementation. The goal was to understand every layer of the RAG pipeline well, not to wrap a framework.

**Why SSE for ingestion?**
Ingesting a large repository takes 30–120 seconds. A synchronous endpoint would leave the UI hanging with no feedback. SSE streams progress updates per batch, enabling the real-time progress bar and cancel functionality without WebSocket complexity.
