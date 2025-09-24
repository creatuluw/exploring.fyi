-- Migration to Slug-Only System
-- This migration aligns all tables to use simple slugs instead of complex session:slug IDs
-- Run this script to fix database persistence issues with the simplified system

BEGIN;

-- =========================================
-- STEP 1: Ensure required extensions and functions
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update the slug generation function
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(title),
          '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create or update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =========================================
-- STEP 2: Drop and recreate content tables for clean slate
-- =========================================

-- Drop dependent tables first (foreign key constraints)
DROP TABLE IF EXISTS checks_done CASCADE;
DROP TABLE IF EXISTS paragraphs CASCADE;  
DROP TABLE IF EXISTS chapters CASCADE;

-- Keep toc table (it already uses TEXT for IDs)
-- But ensure it has the correct structure
DROP TABLE IF EXISTS toc CASCADE;

-- =========================================
-- STEP 3: Create ToC table with slug-only system
-- =========================================

CREATE TABLE toc (
  id TEXT PRIMARY KEY, -- Simple slug like "frontend-ontwikkeling"
  topic_id TEXT NOT NULL, -- Same as id for consistency
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_minutes INT NOT NULL DEFAULT 0,
  total_chapters INT NOT NULL DEFAULT 0,
  total_paragraphs INT NOT NULL DEFAULT 0,
  ai_model TEXT DEFAULT 'gemini-2.5-flash',
  generation_options JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, topic_id)
);

-- =========================================
-- STEP 4: Create chapters table with slug-only system
-- =========================================

CREATE TABLE chapters (
  id TEXT PRIMARY KEY, -- Format: "frontend-ontwikkeling-chapter-1"
  topic_id TEXT NOT NULL, -- Format: "frontend-ontwikkeling"
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

-- =========================================
-- STEP 5: Create paragraphs table with slug-only system
-- =========================================

CREATE TABLE paragraphs (
  id TEXT PRIMARY KEY, -- Format: "frontend-ontwikkeling-chapter-1-paragraph-2"
  topic_id TEXT NOT NULL, -- Format: "frontend-ontwikkeling"
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

-- =========================================
-- STEP 6: Create checks_done table with slug-only system
-- =========================================

CREATE TABLE checks_done (
  id TEXT PRIMARY KEY, -- Format: "frontend-ontwikkeling-chapter-1-check-1234567890"
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL, -- Format: "frontend-ontwikkeling"
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

-- =========================================
-- STEP 7: Create indexes for performance
-- =========================================

-- ToC table indexes
CREATE INDEX IF NOT EXISTS idx_toc_topic_id ON toc(topic_id);
CREATE INDEX IF NOT EXISTS idx_toc_session_id ON toc(session_id);
CREATE INDEX IF NOT EXISTS idx_toc_difficulty ON toc(difficulty);
CREATE INDEX IF NOT EXISTS idx_toc_created_at ON toc(created_at);

-- Chapters table indexes
CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);
CREATE INDEX IF NOT EXISTS idx_chapters_session_id ON chapters(session_id);
CREATE INDEX IF NOT EXISTS idx_chapters_topic_index ON chapters(topic_id, index);

-- Paragraphs table indexes
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_topic_id ON paragraphs(topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_session_id ON paragraphs(session_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_index ON paragraphs(chapter_id, index);

-- Checks table indexes
CREATE INDEX IF NOT EXISTS idx_checks_done_session_id ON checks_done(session_id);
CREATE INDEX IF NOT EXISTS idx_checks_done_topic_id ON checks_done(topic_id);
CREATE INDEX IF NOT EXISTS idx_checks_done_chapter_id ON checks_done(chapter_id);

-- =========================================
-- STEP 8: Enable Row Level Security (RLS)
-- =========================================

ALTER TABLE toc ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 9: Create RLS policies
-- =========================================

-- ToC policies
CREATE POLICY "Users can access their own toc" ON toc 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);
CREATE POLICY "Allow toc access" ON toc FOR ALL USING (true);

-- Chapters policies
CREATE POLICY "Users can access their own chapters" ON chapters 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);
CREATE POLICY "Allow chapters access" ON chapters FOR ALL USING (true);

-- Paragraphs policies
CREATE POLICY "Users can access their own paragraphs" ON paragraphs 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);
CREATE POLICY "Allow paragraphs access" ON paragraphs FOR ALL USING (true);

-- Checks policies
CREATE POLICY "Users can access their own checks" ON checks_done 
  FOR ALL USING (session_id = current_setting('request.jwt.claim.session_id', true)::uuid);
CREATE POLICY "Allow checks access" ON checks_done FOR ALL USING (true);

-- =========================================
-- STEP 10: Create updated_at triggers
-- =========================================

CREATE TRIGGER update_toc_updated_at BEFORE UPDATE ON toc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checks_done_updated_at BEFORE UPDATE ON checks_done
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- STEP 11: Update topics table to ensure slug field exists
-- =========================================

-- Add slug column if it doesn't exist (for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'topics' AND column_name = 'slug') THEN
    ALTER TABLE topics ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Update existing topics to generate slugs if they don't have them
UPDATE topics 
SET slug = generate_slug(title) 
WHERE slug IS NULL OR slug = '';

-- Create index on slug for performance
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);

-- =========================================
-- STEP 12: Clean up
-- =========================================

-- Drop the helper function (it's recreated in step 1 if needed)
-- Keep it for potential future use
-- DROP FUNCTION IF EXISTS generate_slug(TEXT);

COMMIT;

-- =========================================
-- VERIFICATION QUERIES (run these after the migration)
-- =========================================

-- Check table structures
-- \d toc
-- \d chapters  
-- \d paragraphs
-- \d checks_done

-- Verify data (should be empty after migration)
-- SELECT COUNT(*) FROM toc;
-- SELECT COUNT(*) FROM chapters;
-- SELECT COUNT(*) FROM paragraphs;
-- SELECT COUNT(*) FROM checks_done;

-- Test slug generation
-- SELECT generate_slug('Frontend Ontwikkeling'); -- Should return 'frontend-ontwikkeling'
