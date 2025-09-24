## AI Data Loading & Processing Optimization Plan

### Objectives
- Subsecond Time-To-First-Contentful-Paint (TTFCP) for AI-driven screens
- < 3s Time-To-Usable for initial interactions; continuous progressive disclosure thereafter
- Clear, consistent feedback about what is loading, what’s cached, and what is still generating

### Current State (observed)
- Backend
  - Genkit (Gemini 2.5 Flash) via `src/routes/api/analyze-topic/+server.ts` and `src/routes/api/analyze-url/+server.ts` returns full JSON (no streaming)
  - Paragraph/content generation streams via SSE in `src/routes/api/generate-content-stream/+server.ts`
  - Supabase persists topics and content (`src/routes/topic/[slug]/+page.ts` uses streaming client `generateContentStreaming`)
- Frontend
  - Mind map uses optimistic placeholder nodes and later replacement (`src/lib/components/MindMap.svelte`)
  - Explore page updates mind map via callbacks (`src/routes/explore/+page.svelte`), but calls non-streaming `analyzeTopic` for first load in places
  - Skeleton components exist for mind map and content pages, plus granular progress in ToC

Key gaps
- Topic/URL analysis endpoints are not streaming → long initial wait for mind-map bootstrapping
- Limited multi-tier caching for AI results; cache hits are not guaranteed early in lifecycle
- Paragraph generation is sequential per section; bounded parallelism not consistently applied
- No unified abort/cancel of in-flight AI work on route changes
- Heavy components are always loaded; code-splitting opportunities

### Target SLAs
- TTFCP ≤ 500ms on broadband; ≤ 1000ms on 3G Fast
- First interactive node/content ≤ 1500ms
- Max wait for any visible placeholder ≤ 3000ms (then fallback or cached data appears)

### Backend Improvements
1) Stream topic/url analysis via SSE
   - Add streaming variants: `POST /api/analyze-topic-stream`, `POST /api/analyze-url-stream`
   - Emit events: `metadata` (main node), `aspects_batch` (batches of child nodes), `complete`
   - Server timeout guards (2s): if model TTFB > 2s, send synthetic minimal payload immediately

2) Bounded concurrency for paragraphs
   - In `generate-content-stream`, generate paragraphs with concurrency N=3–5 per section
   - Emit `paragraph` stub immediately, followed by `paragraph_chunk` and `paragraph_complete`

3) Multi-tier caching
   - Key by stable hash: model+prompt version+inputs+language+difficulty
   - Tiers:
     - Edge cache/CDN: small JSON chunks for metadata/outline
     - Supabase: persisted full results and partials (outline+per-paragraph)
     - In-memory LRU on server: hot window 10–15 minutes
   - Serve-cache-first: return cached `metadata`/`outline` within 100–200ms, backfill async

4) Precomputation and warming
   - Precompute outlines for top topics and last-visited topics
   - Background workers to fill missing paragraphs opportunistically

5) Server-Timing and budgets
   - Add `Server-Timing` headers: `ai_ttfb`, `ai_outline_ms`, `ai_paragraph_ms_avg`
   - Log slow spans to APM for budget enforcement

### Frontend Improvements
1) Always-streamed mind map bootstrap
   - Switch to streaming API for topic/url creation on Explore
   - Show center node instantly; draw edges/nodes in small batches (4–6) every 150–250ms

2) Unified loading feedback
   - Standardize skeletons and progress bars across Explore/Topic/Chat panels
   - Indicate source: "From cache" vs "Generating…" (already present in ToC) everywhere

3) Optimistic UI + fallbacks
   - Optimistically expand nodes with placeholders; replace progressively (already supported) 
   - If no data in 2s, show cached related topics or last session’s snapshot

4) Abortability
   - Wrap all fetch/SSE calls with `AbortController`; cancel on route/nav, tab hidden, or user cancel
   - Ensure server respects `close()` by stopping further generation for that request

5) Chunk sizing and pacing
   - Keep paragraphs ≤ 1–2k chars to start rendering earlier
   - Outline first, then stream per-paragraph chunks every 50–100ms to keep UI alive

6) Code-splitting and lazy loading
   - Lazy-load heavy components (`MindMap`, `MarkdownRenderer`) and editors
   - Split vendor/model SDKs (Genkit client not shipped to browser now, keep it server-only)

### Data & API Contracts
- Streaming message shapes
  - `metadata`: { title, difficulty, estimatedTime }
  - `outline`: [{ id, title, paragraphs: [{ id, title, order }] }]
  - `paragraph`: { id, title, sectionId, order, content? }
  - `paragraph_chunk`: { id, contentAppend }
  - `paragraph_complete`: full paragraph object
  - `complete`: { success: true }

### Rollout Plan (phased)
1) Week 1
   - Implement SSE for topic/url analysis, update Explore to use it
   - Add abort controllers and unified loaders
2) Week 2
   - Concurrency for paragraphs; cache-first serves for metadata/outline
   - Add Server-Timing and perf dashboards
3) Week 3
   - Code-split heavy components; precompute hot topics
   - Add perf tests and budgets to CI

### Success Metrics
- 95th percentile TTFCP ≤ 1s; Outline visible ≤ 1.5s; First paragraph started ≤ 2s
- ≥ 60% of topic loads served with some cache
- Cancelled navigations free server work within 200ms

### Concrete Tasks (high-level)
- Add SSE endpoints for topic/url analysis and client handlers
- Parallelize paragraphs with concurrency limits and strict chunk sizes
- Introduce multi-tier caching (edge, DB, in-memory) with cache-first
- Unify loading UI and add clear cache vs generate badges
- Add abort/cancel plumbing end-to-end
- Lazy-load heavy components and code-split routes
- Add performance telemetry and CI budgets


