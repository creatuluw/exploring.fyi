# Chapters & Paragraphs Schema (Normalized)

This document defines the normalized database schema and data contracts required to implement the flow described in `app-flow.md`:

- ToC-first generation per topic/node (chapters list with short descriptions)
- Paragraph content generated on-demand (sequential, gated by user interaction)
- Per-paragraph mark-as-read, time tracking, and chat
- Chapter “Check” flow (3 questions, scoring 1–10) [separate task]

## Tables

### chapters

Purpose: Store ordered chapters for a topic (ToC level).

Columns:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE`
- `index INT NOT NULL` — chapter order (0-based or 1-based; choose 1-based)
- `title TEXT NOT NULL`
- `description TEXT` — short synopsis as ToC output
- `metadata JSONB` — optional (difficulty hints, estimated time, etc.)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes/Constraints:
- `UNIQUE(topic_id, index)` — stable ordering within a topic
- `INDEX idx_chapters_topic_id(topic_id)`

### paragraphs

Purpose: Store ordered paragraphs within a chapter; content is generated on-demand and cached.

Columns:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE`
- `chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE`
- `index INT NOT NULL` — paragraph order within chapter (1-based)
- `content TEXT` — generated paragraph content (nullable until generated)
- `summary TEXT` — short summary to show in previews (optional)
- `metadata JSONB` — generation metadata (model, tokens, timing)
- `is_generated BOOLEAN NOT NULL DEFAULT FALSE`
- `generated_at TIMESTAMPTZ` — when content was generated
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes/Constraints:
- `UNIQUE(chapter_id, index)` — stable ordering within a chapter
- `INDEX idx_paragraphs_chapter_id(chapter_id)`
- `INDEX idx_paragraphs_topic_id(topic_id)`

## Relationships to Existing Tables

- `topics` → `chapters` (1-to-many)
- `chapters` → `paragraphs` (1-to-many)
- `paragraph_progress.paragraph_id` references `paragraphs.id` (already aligned by name)
- `paragraph_progress.section_id` maps to `chapters.id` (keeps backwards compatibility)
- `paragraph_qa.paragraph_id` references `paragraphs.id`

Note: Existing `content_progress` (section-level) should treat `section_id` as `chapters.id` for chapter-level completion.

## RLS & Policies (to be implemented in migrations task)

- Enable RLS on `chapters` and `paragraphs`
- Anonymous access pattern consistent with existing tables (session-scoped)
- Policies aligned with `topics.session_id` ownership via joins

## Ordering & Gating Logic

- ToC generation inserts all `chapters` (with `index` and `description`), and stubs `paragraphs` rows with `is_generated = FALSE` (optional — or create rows on-demand).
- Paragraph content is generated only when user clicks “Explain next” or “Explain paragraph N”.
- Generated content is persisted and reused on subsequent requests (cache-first).

## Suggested SQL (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  index INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (topic_id, index)
);

CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);

CREATE TABLE IF NOT EXISTS paragraphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  index INT NOT NULL,
  content TEXT,
  summary TEXT,
  metadata JSONB,
  is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, index)
);

CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_topic_id ON paragraphs(topic_id);
```

## TypeScript Data Contracts

See `src/lib/types/index.ts` additions for:
- `ChapterRecord`, `ParagraphRecord`
- `ChapterWithParagraphs`

## Migration Strategy

1. Create tables and indexes: Run `scripts/add-chapters-and-paragraphs.sql`
2. Add checks table: Run `scripts/add-checks-done.sql`
3. Backfill ToC/paragraphs for existing topics (optional)
4. Update services to read/write normalized data
5. Update UI to gate generation and mark-read per paragraph

## Running Migrations

```bash
# Connect to your Railway Supabase PostgreSQL
psql "postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres"

# Run the migrations
\i scripts/add-chapters-and-paragraphs.sql
\i scripts/add-checks-done.sql
```


