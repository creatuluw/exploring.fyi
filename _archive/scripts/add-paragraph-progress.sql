-- Migration: Add paragraph-level reading progress tracking
-- This extends the existing content_progress table to support paragraph tracking

BEGIN;

-- Create new table for paragraph reading progress
CREATE TABLE IF NOT EXISTS paragraph_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    paragraph_id TEXT NOT NULL,
    paragraph_hash TEXT NOT NULL, -- Hash of paragraph content for consistency
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, topic_id, section_id, paragraph_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_paragraph_progress_session_topic ON paragraph_progress(session_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_progress_section ON paragraph_progress(session_id, topic_id, section_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_progress_read_status ON paragraph_progress(session_id, topic_id, is_read);

-- Enable Row Level Security
ALTER TABLE paragraph_progress ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY IF NOT EXISTS "Allow all operations on paragraph_progress" ON paragraph_progress FOR ALL USING (true);

-- Create table for storing Q&A pairs for paragraphs
CREATE TABLE IF NOT EXISTS paragraph_qa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    paragraph_id TEXT NOT NULL,
    paragraph_hash TEXT NOT NULL, -- Hash of paragraph content for consistency
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    ai_model TEXT DEFAULT 'gemini-2.5-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient Q&A queries
CREATE INDEX IF NOT EXISTS idx_paragraph_qa_session_topic ON paragraph_qa(session_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_qa_paragraph ON paragraph_qa(session_id, topic_id, section_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_qa_created ON paragraph_qa(created_at DESC);

-- Enable Row Level Security for Q&A table
ALTER TABLE paragraph_qa ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY IF NOT EXISTS "Allow all operations on paragraph_qa" ON paragraph_qa FOR ALL USING (true);

COMMIT;
