## Completed Tasks

- [x] **Fixed Mind Map Duplicate Key Constraint Violation**: Resolved database constraint error during streaming
  - [x] Identified root cause: streaming process attempting to create duplicate mind maps without checking for existing ones
  - [x] Implemented solution: Check for existing mind map before creating new one in streaming callbacks
  - [x] Applied fix to both `analyzeTopicStreamingWithPersistence` and `analyzeUrlStreamingWithPersistence` functions
  - [x] Error "duplicate key value violates unique constraint mind_maps_topic_id_slug_key" should no longer occur during mind map generation

- [x] SvelteKit project setup with full TypeScript configuration
- [x] Gray design system and responsive UI implemented
- [x] Landing page, header navigation, and input components
- [x] Svelte Flow mind mapping with custom TopicNode/ConceptNode
- [x] Dynamic mind map layout and node relationships
- [x] AI integration via Genkit with Google AI (Gemini 2.5 Flash)
- [x] Topic, URL analysis, and concept expansion services
- [x] API endpoints: /api/analyze-topic, /api/analyze-url, /api/expand-concept
- [x] Content generation endpoint: /api/generate-content
- [x] Progressive streaming of mind map nodes with loading indicators
- [x] Navigation from mind map nodes to detailed content pages
- [x] Content components: ContentSection, SourcesList, RelatedConcepts
- [x] Railway Supabase deployment (Kong, PostgREST, Auth, Realtime, Studio, DB)
- [x] Database schema created and tested (sessions, topics, mind_maps, sources,
  content_progress, paragraph_progress, paragraph_qa, ai_generations)
- [x] Supabase client and database service layer (sessions, topics, mindMaps,
  sources, progress)
- [x] Anonymous session creation and persistence across browser sessions
- [x] Mind map persistence during streaming and resume functionality
- [x] Complete history dashboard with search/filter and analytics
- [x] Inline node details drawer and learn-more flow polish
- [x] Optimistic UI Phase 1 (node expansion, skeletons, instant navigation)
- [x] Sequential section-by-section content generation (faster first content)


## Bug Fixes Completed

- [x] Fix Genkit import error: `@genkit-ai/googleai` → `@genkit-ai/google-genai`
- [x] Fix safe-buffer/Express client-side bundling error by adding browser guards
- [x] Update TocGenerationService with dynamic imports and server-side guards
- [x] Configure Vite to properly handle Node.js dependencies
- [x] Fix "module is not defined" error in @genkit-ai/google-genai by separating types from main genkit module to avoid client-side evaluation
- [x] Fix session timing issue where mind map initialization started before session was ready, causing "No active session" errors
- [x] Fix topic page 500 errors: UUID vs slug mismatch, database query errors, and poor error handling
  - Fixed mind map navigation generating slug-based IDs that database couldn't process as UUIDs
  - Added deterministic UUID generation for slug-based topic IDs using session context
  - Enhanced API error handling to show detailed error messages instead of "[object Object]"
  - Added database compatibility for both UUID and slug-based topic IDs

## Atomic Tasks - AI Flow Redesign

- [x] Define DB schema for chapters and paragraphs (normalized)
- [x] Add checks_done table for chapter assessments with scoring
- [x] Write SQL migrations and RLS policies for new tables
- [x] Index new tables for topic_id/session_id lookups
- [x] Create database service layers for chapters and paragraphs
- [x] Create database service layer for checks_done table
- [x] Update supabase.ts with new table types and schemas
- [x] Implement ToC-first generation service per selected node/topic
- [x] Persist ToC (chapters + paragraphs with order) to DB
- [x] Build streaming ToC API (/api/generate-toc, SSE-capable)
- [x] Implement paragraph-on-demand generation endpoint (/api/generate-paragraph)
- [x] Gate content: show next paragraph only on user request
- [x] Update UI: add "Explain next" control per section/paragraph
- [x] Update UI: per-paragraph spinners and progressive reveal
- [x] Ensure mark-as-read & time tracking per paragraph (reuse/extend progress)
- [x] Fix topic re-visit flow: preserve reading progress, show "continue reading" option, and direct users to content instead of regenerating ToC when returning to already-explored topics
- [x] Implement chapter completion when all paragraphs read
- [ ] Re-implement the ai_generations table with proper schema and constraints this can be found in the src\lib\database\supabase.ts file
- [ ] Implement chapter “Check” flow (3 AI questions + scoring 1-10)
- [ ] Build /api/chapter-check endpoint and persistence to checks_done
- [ ] Add chapter check UI with drawer and result summary
- [ ] Integrate paragraph chat with new storage linkage (ids, hashes)
- [ ] Add cache layer for ToC/paragraphs (reuse ContentCacheService)
- [ ] Resume from cache/history with incremental regeneration if missing
- [ ] Update streamingContent to sequence: concepts → chapters → paragraphs
- [ ] Improve layout to guarantee non-overlap and compactness
- [ ] Add layout tests for dense node graphs (100+ nodes)
- [ ] Unify loading components and badges across pages
- [ ] History page: surface cached ToCs and quick resume
- [ ] Write unit tests for ToC, paragraph generation, and checks
- [ ] Write integration tests for sequential paragraph gating
- [ ] Add e2e tests for full flow (topic → ToC → paragraphs → check)
- [x] Produce docs in ./docs for new APIs and flows
- [x] Create llms.txt at repo root describing endpoints and usage
- [x] Fixed critical API errors: genkit initialization syntax, missing AI instance in paragraph generation, and Supabase 406 content-type headers
- [x] Resolved persistent 500 errors in ToC generation by creating working API endpoint that bypasses problematic service dependencies
- [x] Identified and isolated issues with TocGenerationService imports causing server-side failures
- [x] Updated frontend to use working API endpoints for ToC generation
- [x] Fixed Supabase 406 "Not Acceptable" errors by updating client headers with proper Accept-Profile configuration
- [x] Improved database query error handling by using maybeSingle() instead of single() to prevent errors when records don't exist
- [x] Enhanced topic page load logic to gracefully handle missing database records and continue with content generation
- [x] Fixed "Explain next" paragraph generation 500 error by adding missing model parameter to Genkit AI generate() calls
- [x] Fixed paragraph generation database mismatch by enabling fallback content generation for non-persisted paragraph IDs
- [x] Enhanced ToC API to use proper UUIDs instead of string identifiers to prevent database UUID validation errors
- [x] Improved error handling in database services to convert Supabase errors to proper Error instances
- [x] **Content Caching System**: Implemented comprehensive content caching with localStorage persistence and background sync
  - [x] Created contentCache store with localStorage synchronization
  - [x] Implemented background sync service for offline/online content synchronization
  - [x] Added API endpoints for checking and saving paragraph content to database
  - [x] Integrated caching into topic page with cache status indicators
  - [x] Added automatic cache management with expiry and size limits
  - [x] Implemented cache-first loading strategy to eliminate "No active session" errors on page refresh
  - [x] Added visual indicators for cached content and online/offline status
- [ ] Provide migration script to backfill legacy content into new schema
- [ ] Add feature flags to toggle new flow during rollout
- [x] **Fixed Slow Mind Map Loading**: Resolved session initialization blocking mind map display
  - [x] Modified explore page to start mind map generation immediately instead of waiting for session
  - [x] Updated persistence services to wait for session internally without blocking UI
  - [x] Restored immediate central topic display like in earlier iterations
  - [x] Enhanced user experience by showing mind map loading state immediately
  - [x] Session initialization now happens in background while mind map renders
- [x] **Fixed Sessions Table Database Error**: Resolved 400 "record new has no field updated_at" error
  - [x] Identified missing `updated_at` field in sessions table causing database trigger failures
  - [x] Added `updated_at` field to sessions table via direct PostgreSQL migration
  - [x] Updated TypeScript Database interface to include `updated_at` field for sessions
  - [x] Modified SessionService methods to include `updated_at` in update operations
  - [x] Verified fix with comprehensive session operations testing
  - [x] Session initialization on homepage now works without 400 errors
- [x] **Settings Configuration System**: Created configurable settings system for AI generation and mindmap parameters
  - [x] Created settings.json file with all hardcoded values moved to configuration
  - [x] Implemented TypeScript settings module with type safety and easy access
  - [x] Integrated settings with AI generation APIs (temperature, max tokens, max chapters, max words)
  - [x] Updated mindmap layout services to use configurable node positioning and radius settings
  - [x] Replaced hardcoded values across the application with settings constants
  - [x] Added configurable limits for pagination, search results, and API timeouts
  - [x] Settings include: max-mindmap-nodes, max-chapters-generated, max-paragraphs-generated, max-words-per-paragraph, ai-model-temperature, ai-max-output-tokens, mindmap positioning, default language and difficulty


