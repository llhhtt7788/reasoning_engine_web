# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Med-Go 推理工作台 — an AI-powered medical reasoning workbench built with Next.js (App Router). It supports multi-turn conversations with streaming responses, knowledge document management, and reasoning trace visualization. The UI is Chinese-first (target: Chinese medical professionals).

Three API versions coexist (v1, v2, v3); v3 is the current default.

## Commands

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint (flat config, ESLint 9+)
```

No test framework is installed. Manual API testing uses `.http` files in `tests/` (VSCode REST Client format) and scripts in `tools/`.

## Environment Setup

1. `cp .env.example .env.local`
2. Set `NEXT_PUBLIC_API_URL` (chat endpoint for browser) and `NEXT_PUBLIC_BACKEND_BASE_URL` (backend origin for server proxy routes — protocol+host+port only, no path)
3. Backend must be running (default: `http://localhost:11211`)
4. `npm install && npm run dev`

Optional: `ENABLE_REQUEST_LOGS=1` writes server-side request logs to `logs/`.

## Architecture

### Server-Side Proxy Pattern

All browser-to-backend communication is proxied through Next.js route handlers to avoid CORS:

```
Browser → /api/v3/communicate (Next.js route handler) → http://localhost:11211/api/v3/communicate (backend)
```

`next.config.ts` also has dev-time rewrites that forward `/api/:path*` to `localhost:11211`.

### API Route Handlers (`app/api/`)

- `v1/chat/context/` — v1 streaming chat proxy
- `v3/communicate/` — v3 unified communicate endpoint (streaming + non-streaming)
- `v3/traces/[trace_id]/` — fetch trace details
- `v1/conversations/` — list/create conversations
- `knowledge/documents/` — knowledge base CRUD and file upload
- `proxy/` — generic SSE proxy

### Streaming (SSE)

Custom SSE parsers (not browser EventSource) for more control:

- `lib/sseClient.ts` — v1/v2: callback-based, handles content/reasoning/route/observability events
- `lib/v3SseClient.ts` — v3: simpler event model (token/status/evidence/done/error), AbortController support

### State Management (Zustand)

Stores in `store/`:

- `v3ChatStore.ts` — main v3 chat state: messages, streaming, traces, conversations
- `chatStore.ts` — v1/v2 chat state with session management
- `layoutStore.ts` — sidebar visibility, active view
- `identityStore.ts` — user/app identity defaults from env
- `toastStore.ts`, `mdtStore.ts`, `patientStore.ts`, `agentStore.ts`

### Component Structure

```
V3AppLayout (layout/V3AppLayout.tsx — root with sidebar)
├── PrimarySidebar (navigation)
├── V3SessionSidebar (conversation list)
├── V3Workspace (main chat + trace panel)
│   ├── V3ChatContainer → V3MessageList → V3MessageBubble
│   ├── InputBar (text + image upload)
│   └── V3TracePanel (reasoning trace visualization)
├── KnowledgeUploadsModal
└── SettingsModal
```

v3 components live in `components/v3/`. MDT (multi-disciplinary team) components in `components/mdt/`.

### Type Definitions

All in `types/`: `v3Chat.ts`, `chat.ts`, `knowledge.ts`, `patient.ts`, `mdt.ts`, `thinkingTrace.ts`.

### Key Files

- `store/v3ChatStore.ts` — v3 chat state machine and send logic
- `lib/v3SseClient.ts` — v3 streaming implementation
- `components/v3/V3Workspace.tsx` — main workspace UI
- `app/api/v3/communicate/route.ts` — v3 proxy handler
- `types/v3Chat.ts` — v3 API type definitions
- `docs/v3/v3_api.md` — v3 API specification

## Tech Stack

- **Framework:** Next.js 16+ with App Router, React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`), no component library
- **State:** Zustand 5
- **Rendering:** React Markdown + remark-gfm + remark-math + rehype-katex for LaTeX
- **Visualization:** React Flow (trace graphs), ECharts, Dagre (DAG layout)
- **Path alias:** `@/*` maps to project root

## Conventions

- `'use client'` directive on all interactive components
- API calls wrapped in `lib/` utilities, never called directly from components
- Tailwind utility classes for all styling (no separate CSS files except `globals.css`)
- Chinese comments and labels throughout the codebase
