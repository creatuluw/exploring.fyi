-- Add ToC (Table of Contents) table to store generated ToC metadata
-- This table stores the overall structure and metadata for each generated ToC

BEGIN;

-- Create toc table
CREATE TABLE IF NOT EXISTS toc (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug"
  topic_id TEXT NOT NULL, -- Format: "session_id:topic_slug" (same as id for consistency)
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- The topic title
  description TEXT, -- AI-generated description of the topic
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INT NOT NULL DEFAULT 0,
  total_chapters INT NOT NULL DEFAULT 0,
  total_paragraphs INT NOT NULL DEFAULT 0,
  ai_model TEXT DEFAULT 'gemini-2.5-flash',
  generation_options JSONB, -- Store options used for generation (context, nodeDescription, etc.)
  metadata JSONB, -- Additional metadata from AI generation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, topic_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_toc_topic_id ON toc(topic_id);
CREATE INDEX IF NOT EXISTS idx_toc_session_id ON toc(session_id);
CREATE INDEX IF NOT EXISTS idx_toc_difficulty ON toc(difficulty);
CREATE INDEX IF NOT EXISTS idx_toc_created_at ON toc(created_at);

-- Add foreign key constraint to ensure chapters reference valid ToC
-- Note: This is optional since topic_id already serves this purpose
-- ALTER TABLE chapters ADD CONSTRAINT fk_chapters_toc_id 
--   FOREIGN KEY (topic_id) REFERENCES toc(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE toc ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access their own toc" ON toc 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);

-- For now, allow all access (anonymous session model)
CREATE POLICY "Allow toc access" ON toc FOR ALL USING (true);

-- Updated timestamp trigger
CREATE TRIGGER update_toc_updated_at BEFORE UPDATE ON toc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
