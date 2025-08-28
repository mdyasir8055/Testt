# Repository Guide

## Purpose
Full‑stack PDF/URL knowledge retrieval chatbot. Users upload PDFs or URLs, content is chunked and retrieved via a RAG pipeline, and queried through chat sessions.

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind, shadcn/ui, Wouter, TanStack Query
- **Backend**: Node.js (Express, TypeScript, ESM), Vite middleware in dev
- **DB/Schema**: PostgreSQL (Drizzle ORM), Zod types shared between front/back in `shared/schema.ts`
- **Storage**: In-memory storage implementation (`MemStorage`) for runtime data
- **AI/Processing**: Multiple providers (Groq, Gemini, Hugging Face). Voice I/O stubs included

## Key Paths
- **Client**: `client/src`
- **Server**: `server/`
  - Entry: `server/index.ts`
  - Routes: `server/routes.ts`
  - Dev/Static serving helpers: `server/vite.ts`
  - In-memory storage: `server/storage.ts`
  - (Optional) Python service utilities: `server/services/`
- **Shared types/schema**: `shared/schema.ts`
- **Uploads folder**: `uploads/`

## Scripts (package.json)
- `npm run dev` — start Express in development (tsx) with Vite middleware
- `npm run build` — build client (Vite) and bundle server (esbuild) to `dist`
- `npm start` — start production server from `dist`
- `npm run check` — TypeScript type-check
- `npm run db:push` — apply schema to database via drizzle-kit

Note: README may mention scripts like `db:generate`, `db:migrate`, `preview` not present in `package.json` here.

## Environment
Create `.env` (values may vary):
- **DATABASE_URL**: PostgreSQL connection string (required for drizzle-kit commands; not required to run dev server with in-memory storage)
- **PORT**: HTTP port (default 5000)
- **HOST**: Host binding (default `localhost` on Windows)
- Optional API keys used by model providers (can also be set via API): `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`

Drizzle config (`drizzle.config.ts`) throws if `DATABASE_URL` is missing, but this only affects drizzle-kit CLI usage, not app runtime.

## Running Locally
1. `npm install`
2. (Optional) Set `DATABASE_URL` if you plan to run drizzle migrations/push
3. `npm run dev`
   - Dev server serves API and client at `http://localhost:5000`

Production:
1. `npm run build`
2. `npm start` (serves static client from `server/public` and API from `dist/index.js`)

## Server Overview
- Express app (`server/index.ts`) sets up:
  - JSON/body parsing
  - API request logging (short JSON snippet in logs)
  - Registers routes via `registerRoutes(app)`
  - Dev: Vite middleware (HMR). Prod: serve from `server/public`
  - Port/host read from env: `PORT` (default 5000), `HOST` (default `localhost`)

### API Endpoints (high‑level)
- `POST /api/documents/upload` — PDF upload (multer). Accepts only `application/pdf`
- `POST /api/documents/upload-url` — register and process content from a URL
- `GET /api/documents/:id/status` — processing status
- `GET /api/documents` — list user documents (`?userId=` optional, defaults to `default-user`)
- `POST /api/chat/sessions` — create chat session
- `GET /api/chat/sessions` — list sessions for user
- `GET /api/chat/sessions/:sessionId/messages` — get messages for a session
- `POST /api/chat/query` — main RAG query
- `POST /api/chat/voice-query` — voice input to query flow (stub transcription)
- `POST /api/chat/text-to-speech` — TTS generation (stub)
- `POST /api/chat/compare` — compare multiple documents
- `POST /api/models/set-api-key` — store provider API key (in-memory)
- `GET /api/models/:provider` — list models for provider
- `POST /api/models/test-key` — validate provider API key
- `POST /api/documents/:id/retry` — retry processing

### Storage
- `server/storage.ts` implements `IStorage` with an in-memory `MemStorage`:
  - Users, Documents, Document Chunks, Chat Sessions, Chat Messages
  - Suitable for development/testing. Replace with DB-backed storage for persistence

### Uploads
- `uploads/` created on boot if missing
- PDF uploads saved via Multer; URL content processed and chunked

## Client Overview
- Router (`client/src/App.tsx`) uses Wouter; Home page (`client/src/pages/home`)
- Uses TanStack Query, shadcn/ui, Tailwind
- Communicates with API routes above

## Shared Schema/Types
- `shared/schema.ts` defines Drizzle tables and Zod insert schemas
- Exported TS types: `User`, `InsertUser`, `Document`, `InsertDocument`, `DocumentChunk`, `ChatSession`, `InsertChatSession`, `ChatMessage`, `InsertChatMessage`
- Document fields include: `id`, `userId`, `filename`, `originalName`, `size`, `mimeType`, `sourceType` ("pdf" | "url"; string), `sourceUrl` (nullable), `status`, timestamps, `metadata`, `industry`, `chunkCount`

## TypeScript Config
- `tsconfig.json` paths:
  - `@/*` → `client/src/*`
  - `@shared/*` → `shared/*`
- Strict mode enabled; ESM modules; noEmit for type-check workflow

## Windows Notes
- Host binding defaults to `localhost` for Windows in `server/index.ts`
- Reuse‑port is disabled in comments; current binding uses standard Node http server

## Troubleshooting
- PDF upload rejected: ensure client sends `application/pdf`
- Port in use: set `PORT` env
- Database commands fail: set `DATABASE_URL` and use `npm run db:push`
- Static files in prod: ensure `npm run build` generated assets; server serves from `server/public`

## Contributing Tips
- Add API endpoints in `server/routes.ts`
- Update shared types in `shared/schema.ts` to keep front/back in sync
- For persistence, implement a DB-backed `IStorage` and replace `MemStorage` export