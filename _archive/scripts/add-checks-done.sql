-- Add checks_done table with RLS and indexes

BEGIN;

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow checks_done access" ON checks_done FOR ALL USING (true);

CREATE TRIGGER update_checks_done_updated_at BEFORE UPDATE ON checks_done
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
