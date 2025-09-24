-- Complete migration script to add missing tables and slug fields
-- Run this in pgAdmin Query Tool

BEGIN;

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- STEP 1: Create slug generation function
-- =========================================

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

-- =========================================
-- STEP 2: Create core tables first (if they don't exist)
-- =========================================

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL,
    settings JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    topic_count INTEGER DEFAULT 0
);

-- Topics table (with slug field included)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT,
    source_url TEXT DEFAULT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
    mind_map_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mind Maps table (with slug field included)
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    slug TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    layout_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    credibility_score NUMERIC(3,1) NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Progress table
CREATE TABLE IF NOT EXISTS content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    time_spent_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_viewed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, topic_id, section_id)
);

-- Add indexes for core tables
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_topics_session_id ON topics(session_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_mind_maps_topic_id ON mind_maps(topic_id);
CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_sources_credibility_score ON sources(credibility_score);
CREATE INDEX IF NOT EXISTS idx_content_progress_session_id ON content_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_topic_id ON content_progress(topic_id);

-- Enable RLS for core tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

-- Core table policies
DROP POLICY IF EXISTS "Allow session access" ON sessions;
DROP POLICY IF EXISTS "Allow topic access" ON topics;
DROP POLICY IF EXISTS "Allow mind map access" ON mind_maps;
DROP POLICY IF EXISTS "Allow source access" ON sources;
DROP POLICY IF EXISTS "Allow progress access" ON content_progress;

CREATE POLICY "Allow session access" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow topic access" ON topics FOR ALL USING (true);
CREATE POLICY "Allow mind map access" ON mind_maps FOR ALL USING (true);
CREATE POLICY "Allow source access" ON sources FOR ALL USING (true);
CREATE POLICY "Allow progress access" ON content_progress FOR ALL USING (true);

-- =========================================
-- STEP 3: Add slug fields to existing tables (if needed)
-- =========================================

-- Add slug column to topics table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'topics' AND column_name = 'slug'
  ) THEN
    ALTER TABLE topics ADD COLUMN slug TEXT;
    RAISE NOTICE 'Added slug column to topics table';
  ELSE
    RAISE NOTICE 'slug column already exists in topics table';
  END IF;
END $$;

-- Add slug column to mind_maps table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mind_maps' AND column_name = 'slug'
  ) THEN
    ALTER TABLE mind_maps ADD COLUMN slug TEXT;
    RAISE NOTICE 'Added slug column to mind_maps table';
  ELSE
    RAISE NOTICE 'slug column already exists in mind_maps table';
  END IF;
END $$;

-- Populate slugs for existing topics
UPDATE topics 
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Populate slugs for existing mind_maps
UPDATE mind_maps 
SET slug = t.slug
FROM topics t 
WHERE mind_maps.topic_id = t.id 
AND mind_maps.slug IS NULL;

-- =========================================
-- STEP 4: Add slug constraints and indexes
-- =========================================

-- Make slug NOT NULL for topics (after populating existing records)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'topics' AND column_name = 'slug') THEN
    ALTER TABLE topics ALTER COLUMN slug SET NOT NULL;
    RAISE NOTICE 'Set topics.slug to NOT NULL';
  END IF;
END $$;

-- Make slug NOT NULL for mind_maps (after populating existing records)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'slug') THEN
    ALTER TABLE mind_maps ALTER COLUMN slug SET NOT NULL;
    RAISE NOTICE 'Set mind_maps.slug to NOT NULL';
  END IF;
END $$;

-- Add unique constraints (with error handling for existing constraints)
DO $$
BEGIN
  -- Add unique constraint on topics slug within session
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_topic_slug_per_session') THEN
    ALTER TABLE topics ADD CONSTRAINT unique_topic_slug_per_session UNIQUE (session_id, slug);
    RAISE NOTICE 'Added unique constraint for topics slug per session';
  END IF;
  
  -- Add unique constraint on mind_maps slug globally
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_mindmap_slug') THEN
    ALTER TABLE mind_maps ADD CONSTRAINT unique_mindmap_slug UNIQUE (slug);
    RAISE NOTICE 'Added unique constraint for mind_maps slug';
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_session_slug ON topics(session_id, slug);
CREATE INDEX IF NOT EXISTS idx_mind_maps_slug ON mind_maps(slug);

-- =========================================
-- STEP 5: Create additional tables
-- =========================================

-- Table of Contents (TOC) table
CREATE TABLE IF NOT EXISTS toc (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug"
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  estimated_time_minutes INTEGER DEFAULT 30,
  total_chapters INTEGER DEFAULT 0,
  total_paragraphs INTEGER DEFAULT 0,
  ai_model TEXT,
  generation_options JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_toc_topic_id ON toc(topic_id);
CREATE INDEX IF NOT EXISTS idx_toc_session_id ON toc(session_id);
CREATE INDEX IF NOT EXISTS idx_toc_difficulty ON toc(difficulty);

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

-- Checks Done table
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

-- AI Generations table
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('analysis', 'expansion', 'content_page')),
  input_data JSONB NOT NULL,
  generated_content JSONB DEFAULT NULL,
  processing_time_ms INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_topic_id ON ai_generations(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_content_type ON ai_generations(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);

-- Paragraph Progress table
CREATE TABLE IF NOT EXISTS paragraph_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  paragraph_id TEXT NOT NULL,
  paragraph_hash TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paragraph_progress_session_id ON paragraph_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_progress_topic_id ON paragraph_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_progress_paragraph_hash ON paragraph_progress(paragraph_hash);

-- Paragraph QA table
CREATE TABLE IF NOT EXISTS paragraph_qa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  paragraph_id TEXT NOT NULL,
  paragraph_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  ai_model TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paragraph_qa_session_id ON paragraph_qa(session_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_qa_topic_id ON paragraph_qa(topic_id);
CREATE INDEX IF NOT EXISTS idx_paragraph_qa_paragraph_hash ON paragraph_qa(paragraph_hash);

-- Enable RLS
ALTER TABLE toc ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraph_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraph_qa ENABLE ROW LEVEL SECURITY;

-- Permissive policies (align with existing anonymous session model)
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow toc access" ON toc;
DROP POLICY IF EXISTS "Allow chapters access" ON chapters;
DROP POLICY IF EXISTS "Allow paragraphs access" ON paragraphs;
DROP POLICY IF EXISTS "Allow checks_done access" ON checks_done;
DROP POLICY IF EXISTS "Allow ai_generations access" ON ai_generations;
DROP POLICY IF EXISTS "Allow paragraph_progress access" ON paragraph_progress;
DROP POLICY IF EXISTS "Allow paragraph_qa access" ON paragraph_qa;

CREATE POLICY "Allow toc access" ON toc FOR ALL USING (true);
CREATE POLICY "Allow chapters access" ON chapters FOR ALL USING (true);
CREATE POLICY "Allow paragraphs access" ON paragraphs FOR ALL USING (true);
CREATE POLICY "Allow checks_done access" ON checks_done FOR ALL USING (true);
CREATE POLICY "Allow ai_generations access" ON ai_generations FOR ALL USING (true);
CREATE POLICY "Allow paragraph_progress access" ON paragraph_progress FOR ALL USING (true);
CREATE POLICY "Allow paragraph_qa access" ON paragraph_qa FOR ALL USING (true);

-- Check if the trigger function exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ language ''plpgsql'';
        ';
    END IF;
END $$;

-- updated_at triggers
DROP TRIGGER IF EXISTS update_toc_updated_at ON toc;
CREATE TRIGGER update_toc_updated_at BEFORE UPDATE ON toc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paragraphs_updated_at ON paragraphs;
CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checks_done_updated_at ON checks_done;
CREATE TRIGGER update_checks_done_updated_at BEFORE UPDATE ON checks_done
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paragraph_progress_updated_at ON paragraph_progress;
CREATE TRIGGER update_paragraph_progress_updated_at BEFORE UPDATE ON paragraph_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paragraph_qa_updated_at ON paragraph_qa;
CREATE TRIGGER update_paragraph_qa_updated_at BEFORE UPDATE ON paragraph_qa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- STEP 6: Create slug auto-generation triggers
-- =========================================

-- Function to auto-generate topic slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_topic_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Only generate slug if it's not provided or if title changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    base_slug := generate_slug(NEW.title);
    final_slug := base_slug;
    
    -- Ensure uniqueness within session
    WHILE EXISTS (
      SELECT 1 FROM topics 
      WHERE session_id = NEW.session_id 
      AND slug = final_slug 
      AND id != NEW.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate mind_map slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_mindmap_slug()
RETURNS TRIGGER AS $$
DECLARE
  topic_slug TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Only generate slug if it's not provided
  IF NEW.slug IS NULL THEN
    -- Get the associated topic's slug
    SELECT slug INTO topic_slug FROM topics WHERE id = NEW.topic_id;
    
    IF topic_slug IS NOT NULL THEN
      base_slug := topic_slug || '-mindmap';
      final_slug := base_slug;
      
      -- Ensure global uniqueness for mind_map slugs
      WHILE EXISTS (
        SELECT 1 FROM mind_maps 
        WHERE slug = final_slug 
        AND id != NEW.id
      ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;
      
      NEW.slug := final_slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-slug generation
DROP TRIGGER IF EXISTS trigger_auto_generate_topic_slug ON topics;
CREATE TRIGGER trigger_auto_generate_topic_slug
  BEFORE INSERT OR UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_topic_slug();

DROP TRIGGER IF EXISTS trigger_auto_generate_mindmap_slug ON mind_maps;
CREATE TRIGGER trigger_auto_generate_mindmap_slug
  BEFORE INSERT OR UPDATE ON mind_maps
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_mindmap_slug();

-- Re-create updated_at triggers for existing tables (ensure they work with new slug columns)
DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at 
  BEFORE UPDATE ON topics
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;
CREATE TRIGGER update_mind_maps_updated_at 
  BEFORE UPDATE ON mind_maps
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =========================================
-- STEP 7: Verification and summary
-- =========================================

-- Verify migration completed successfully
SELECT 'Complete migration finished successfully!' as status;

-- Show what was accomplished
SELECT 'Added slug fields to topics and mind_maps tables' as feature_1;
SELECT 'Created missing tables: toc, chapters, paragraphs, checks_done, ai_generations, paragraph_progress, paragraph_qa' as feature_2;
SELECT 'Added auto-generation triggers for slugs' as feature_3;
SELECT 'Added unique constraints and indexes' as feature_4;

-- Show slug statistics
DO $$
BEGIN
  RAISE NOTICE '=== SLUG MIGRATION SUMMARY ===';
  RAISE NOTICE 'Topics with slugs: %', (SELECT COUNT(*) FROM topics WHERE slug IS NOT NULL);
  RAISE NOTICE 'Mind maps with slugs: %', (SELECT COUNT(*) FROM mind_maps WHERE slug IS NOT NULL);
  RAISE NOTICE 'Sample topic slugs: %', (
    SELECT STRING_AGG(slug, ', ') 
    FROM (SELECT slug FROM topics LIMIT 3) as sample
  );
  RAISE NOTICE 'Sample mind map slugs: %', (
    SELECT STRING_AGG(slug, ', ') 
    FROM (SELECT slug FROM mind_maps LIMIT 3) as sample
  );
END $$;

-- Show all tables and their status
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename IN ('toc', 'chapters', 'paragraphs', 'checks_done', 'ai_generations', 'paragraph_progress', 'paragraph_qa') THEN 'NEWLY CREATED'
        WHEN tablename IN ('topics', 'mind_maps') THEN 'ENHANCED WITH SLUGS'
        ELSE 'EXISTING'
    END as table_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY 
  CASE 
    WHEN tablename IN ('toc', 'chapters', 'paragraphs', 'checks_done', 'ai_generations', 'paragraph_progress', 'paragraph_qa') THEN 1
    WHEN tablename IN ('topics', 'mind_maps') THEN 2
    ELSE 3
  END,
  tablename;
