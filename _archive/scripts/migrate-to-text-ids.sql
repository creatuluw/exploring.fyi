-- Migration to convert UUID-based content tables to text-based slug IDs
-- This allows topics to use human-readable slugs unique per user session

BEGIN;

-- Drop existing chapters and paragraphs tables if they exist
DROP TABLE IF EXISTS checks_done CASCADE;
DROP TABLE IF EXISTS paragraphs CASCADE;  
DROP TABLE IF EXISTS chapters CASCADE;

-- Create chapters table with text-based IDs
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug:chapter_index" 
  topic_id TEXT NOT NULL, -- Format: "session_id:topic_slug"
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  index INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (topic_id, index),
  UNIQUE (session_id, topic_id, index)
);

CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_session_id ON chapters(session_id);

-- Create paragraphs table with text-based IDs
CREATE TABLE IF NOT EXISTS paragraphs (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug:chapter_index:paragraph_index"
  topic_id TEXT NOT NULL, -- Format: "session_id:topic_slug" 
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  index INT NOT NULL,
  content TEXT,
  summary TEXT,
  metadata JSONB,
  is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, index),
  UNIQUE (session_id, topic_id, chapter_id, index)
);

CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_topic_id ON paragraphs(topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_session_id ON paragraphs(session_id);

-- Create checks_done table with text-based references
CREATE TABLE IF NOT EXISTS checks_done (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug:chapter_index:timestamp"
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL, -- Format: "session_id:topic_slug"
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for session-based access
CREATE POLICY "Users can access their own chapters" ON chapters 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);

CREATE POLICY "Users can access their own paragraphs" ON paragraphs 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);

CREATE POLICY "Users can access their own checks" ON checks_done 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);

-- For now, allow all access (anonymous session model)
CREATE POLICY "Allow chapters access" ON chapters FOR ALL USING (true);
CREATE POLICY "Allow paragraphs access" ON paragraphs FOR ALL USING (true);
CREATE POLICY "Allow checks access" ON checks_done FOR ALL USING (true);

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checks_done_updated_at BEFORE UPDATE ON checks_done
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
