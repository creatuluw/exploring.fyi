-- Add Chapters and Paragraphs schema with RLS and indexes

BEGIN;

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chapters table
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

-- Paragraphs table
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

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;

-- Permissive policies (align with existing anonymous session model)
CREATE POLICY IF NOT EXISTS "Allow chapters access" ON chapters FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow paragraphs access" ON paragraphs FOR ALL USING (true);

-- updated_at triggers
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
