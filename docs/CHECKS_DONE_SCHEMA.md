# Chapter Checks (checks_done) Schema

Implements the "Check" flow per chapter as described in `app-flow.md`:
- After all paragraphs in a chapter are read, user can trigger a 3-question check
- AI asks three questions, user answers, AI provides feedback and a comprehension score (1–10)
- Results are persisted per session/topic/chapter

## Table: checks_done

Purpose: Record each chapter assessment including questions, answers, AI feedback, and score.

Columns:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `session_id UUID NOT NULL` — references `sessions.id`
- `topic_id UUID NOT NULL` — references `topics.id`
- `chapter_id UUID NOT NULL` — references `chapters.id`
- `questions JSONB NOT NULL` — array of `{ id, text }`
- `answers JSONB NOT NULL` — array of `{ questionId, userAnswer }`
- `ai_feedback JSONB` — structured feedback per question and overall
- `score INT NOT NULL` — 1–10 comprehension score
- `model TEXT` — AI model used
- `duration_seconds INT` — time from start to completion
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes/Constraints:
- `INDEX idx_checks_done_session_id(session_id)`
- `INDEX idx_checks_done_topic_id(topic_id)`
- `INDEX idx_checks_done_chapter_id(chapter_id)`
- Optionally ensure one latest attempt flag if desired (out of scope here)

## Suggested SQL (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS checks_done (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  ai_feedback JSONB,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
  model TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checks_done_session_id ON checks_done(session_id);
CREATE INDEX IF NOT EXISTS idx_checks_done_topic_id ON checks_done(topic_id);
CREATE INDEX IF NOT EXISTS idx_checks_done_chapter_id ON checks_done(chapter_id);
```

## RLS & Policies (to be implemented in migrations task)

- Enable RLS and align with anonymous session rules
- Access constrained to the current session’s data

## TypeScript Data Contracts

See `src/lib/types/index.ts` additions for:
- `ChapterCheckQuestion`, `ChapterCheckAnswer`
- `ChapterCheckAttempt`
