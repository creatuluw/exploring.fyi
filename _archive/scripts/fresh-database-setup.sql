-- Complete Database Setup for exploring.fyi
-- Fresh database setup with slug-only system
-- Run this script on a new PostgreSQL database instance

BEGIN;

-- =========================================
-- STEP 1: Enable required extensions
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search capabilities

-- =========================================
-- STEP 2: Create utility functions
-- =========================================

-- Function to generate slugs from titles
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- STEP 3: Create core tables
-- =========================================

-- Sessions table (manages user sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL,
    settings JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    topic_count INTEGER DEFAULT 0
);

-- Topics table (stores main topics with slugs)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- Generated from title, used as topic_id in content tables
    source_url TEXT DEFAULT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
    mind_map_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, slug) -- Ensure unique slugs per session
);

-- Mind maps table (stores mind map data)
CREATE TABLE mind_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    slug TEXT NOT NULL, -- For URL routing
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    layout_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, slug)
);

-- Sources table (stores source analysis data)
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT,
    metadata JSONB,
    analysis_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- STEP 4: Create content tables with slug-only system
-- =========================================

-- ToC (Table of Contents) metadata table
CREATE TABLE toc (
    id TEXT PRIMARY KEY, -- Simple slug: "frontend-development"
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

-- Chapters table (stores chapter structure)
CREATE TABLE chapters (
    id TEXT PRIMARY KEY, -- "frontend-development-chapter-1"
    topic_id TEXT NOT NULL, -- "frontend-development"
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

-- Paragraphs table (stores paragraph content)
CREATE TABLE paragraphs (
    id TEXT PRIMARY KEY, -- "frontend-development-chapter-1-paragraph-1"
    topic_id TEXT NOT NULL, -- "frontend-development"
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

-- Checks done table (stores completed knowledge checks)
CREATE TABLE checks_done (
    id TEXT PRIMARY KEY, -- "frontend-development-chapter-1-check-1234567890"
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL, -- "frontend-development"
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

-- AI generations table (stores AI generation metadata)
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('analysis', 'expansion', 'content_page', 'toc', 'paragraph')),
    input_data JSONB NOT NULL,
    generated_content JSONB,
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- STEP 5: Create indexes for performance
-- =========================================

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Topics indexes
CREATE INDEX idx_topics_session_id ON topics(session_id);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_source_type ON topics(source_type);
CREATE INDEX idx_topics_created_at ON topics(created_at);

-- Mind maps indexes
CREATE INDEX idx_mind_maps_topic_id ON mind_maps(topic_id);
CREATE INDEX idx_mind_maps_slug ON mind_maps(slug);

-- Sources indexes
CREATE INDEX idx_sources_topic_id ON sources(topic_id);
CREATE INDEX idx_sources_url ON sources(url);

-- ToC indexes
CREATE INDEX idx_toc_topic_id ON toc(topic_id);
CREATE INDEX idx_toc_session_id ON toc(session_id);
CREATE INDEX idx_toc_difficulty ON toc(difficulty);
CREATE INDEX idx_toc_created_at ON toc(created_at);

-- Chapters indexes
CREATE INDEX idx_chapters_topic_id ON chapters(topic_id);
CREATE INDEX idx_chapters_session_id ON chapters(session_id);
CREATE INDEX idx_chapters_topic_index ON chapters(topic_id, index);

-- Paragraphs indexes
CREATE INDEX idx_paragraphs_chapter_id ON paragraphs(chapter_id);
CREATE INDEX idx_paragraphs_topic_id ON paragraphs(topic_id);
CREATE INDEX idx_paragraphs_session_id ON paragraphs(session_id);
CREATE INDEX idx_paragraphs_chapter_index ON paragraphs(chapter_id, index);
CREATE INDEX idx_paragraphs_is_generated ON paragraphs(is_generated);

-- Checks indexes
CREATE INDEX idx_checks_done_session_id ON checks_done(session_id);
CREATE INDEX idx_checks_done_topic_id ON checks_done(topic_id);
CREATE INDEX idx_checks_done_chapter_id ON checks_done(chapter_id);

-- AI generations indexes
CREATE INDEX idx_ai_generations_topic_id ON ai_generations(topic_id);
CREATE INDEX idx_ai_generations_content_type ON ai_generations(content_type);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);

-- =========================================
-- STEP 6: Create triggers for updated_at
-- =========================================

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toc_updated_at BEFORE UPDATE ON toc
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checks_done_updated_at BEFORE UPDATE ON checks_done
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- STEP 7: Create automatic slug generation trigger
-- =========================================

CREATE OR REPLACE FUNCTION auto_generate_topic_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = generate_slug(NEW.title);
        
        -- Ensure uniqueness within session
        WHILE EXISTS (
            SELECT 1 FROM topics 
            WHERE session_id = NEW.session_id 
            AND slug = NEW.slug 
            AND id != COALESCE(NEW.id, uuid_generate_v4())
        ) LOOP
            NEW.slug = NEW.slug || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_slug_trigger BEFORE INSERT OR UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION auto_generate_topic_slug();

-- =========================================
-- STEP 8: Enable Row Level Security (RLS)
-- =========================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE toc ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 9: Create RLS policies (permissive for anonymous sessions)
-- =========================================

-- Sessions policies
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true);

-- Topics policies
CREATE POLICY "Allow all access to topics" ON topics FOR ALL USING (true);

-- Mind maps policies  
CREATE POLICY "Allow all access to mind_maps" ON mind_maps FOR ALL USING (true);

-- Sources policies
CREATE POLICY "Allow all access to sources" ON sources FOR ALL USING (true);

-- ToC policies
CREATE POLICY "Allow all access to toc" ON toc FOR ALL USING (true);

-- Chapters policies
CREATE POLICY "Allow all access to chapters" ON chapters FOR ALL USING (true);

-- Paragraphs policies
CREATE POLICY "Allow all access to paragraphs" ON paragraphs FOR ALL USING (true);

-- Checks policies
CREATE POLICY "Allow all access to checks_done" ON checks_done FOR ALL USING (true);

-- AI generations policies
CREATE POLICY "Allow all access to ai_generations" ON ai_generations FOR ALL USING (true);

-- =========================================
-- STEP 10: Create helpful views
-- =========================================

-- View to get complete topic structure
CREATE VIEW topic_overview AS
SELECT 
    t.id,
    t.session_id,
    t.title,
    t.slug,
    t.source_type,
    t.created_at,
    COALESCE(toc.total_chapters, 0) as chapters_count,
    COALESCE(toc.total_paragraphs, 0) as paragraphs_count,
    COALESCE(toc.difficulty, 'intermediate') as difficulty,
    toc.estimated_time_minutes
FROM topics t
LEFT JOIN toc ON t.slug = toc.topic_id;

-- View to get content progress
CREATE VIEW content_progress AS
SELECT 
    c.topic_id,
    c.session_id,
    COUNT(c.id) as total_chapters,
    COUNT(p.id) as total_paragraphs,
    COUNT(CASE WHEN p.is_generated = true THEN 1 END) as generated_paragraphs,
    ROUND(
        CASE 
            WHEN COUNT(p.id) > 0 
            THEN (COUNT(CASE WHEN p.is_generated = true THEN 1 END)::NUMERIC / COUNT(p.id)::NUMERIC) * 100 
            ELSE 0 
        END, 2
    ) as completion_percentage
FROM chapters c
LEFT JOIN paragraphs p ON c.id = p.chapter_id
GROUP BY c.topic_id, c.session_id;

-- =========================================
-- STEP 11: Insert sample data (optional)
-- =========================================

-- Create a sample session
INSERT INTO sessions (id, user_id, settings, topic_count) 
VALUES ('24dfc336-3040-41fc-ab26-1debc83b9bf2', NULL, '{}', 0);

-- =========================================
-- STEP 12: Grant necessary permissions
-- =========================================

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- Grant permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

COMMIT;

-- =========================================
-- VERIFICATION QUERIES (run these after the setup)
-- =========================================

-- Verify table creation
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Test slug generation
SELECT generate_slug('Frontend Ontwikkeling') as slug;
SELECT generate_slug('Het Romeinse Keizerrijk') as roman_slug;

-- Verify sample session
SELECT * FROM sessions WHERE id = '24dfc336-3040-41fc-ab26-1debc83b9bf2';

-- Show all tables and their basic info
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
