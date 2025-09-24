-- Explore.fyi Database Schema
-- Create all tables required for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table: Track anonymous user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT NULL, -- Future: link to user accounts
    settings JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    topic_count INTEGER DEFAULT 0
);

-- Topics table: Store explored topics and their analysis
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    source_url TEXT DEFAULT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
    mind_map_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_topic_slug_per_session UNIQUE (session_id, slug)
);

-- Mind Maps table: Store complete mind map structures
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    layout_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_mindmap_slug UNIQUE (slug)
);

-- Sources table: Track sources and their credibility
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    credibility_score NUMERIC(3,1) NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Progress table: Track user reading progress
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

-- AI Generations table: Track AI generation metadata
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('analysis', 'expansion', 'content_page')),
    input_data JSONB NOT NULL,
    generated_content JSONB DEFAULT NULL,
    processing_time_ms INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_topics_session_id ON topics(session_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_session_slug ON topics(session_id, slug);
CREATE INDEX IF NOT EXISTS idx_mind_maps_topic_id ON mind_maps(topic_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_slug ON mind_maps(slug);
CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_sources_credibility_score ON sources(credibility_score);
CREATE INDEX IF NOT EXISTS idx_content_progress_session_id ON content_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_content_progress_topic_id ON content_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_topic_id ON ai_generations(topic_id);

-- Enable Row Level Security (RLS) for security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous access (since we're using anonymous sessions)
-- Note: These are permissive for anonymous users - adjust based on your security needs

-- Sessions: Users can manage their own sessions
CREATE POLICY "Allow session access" ON sessions FOR ALL USING (true);

-- Topics: Allow access to topics for the session
CREATE POLICY "Allow topic access" ON topics FOR ALL USING (true);

-- Mind Maps: Allow access via topic
CREATE POLICY "Allow mind map access" ON mind_maps FOR ALL USING (true);

-- Sources: Allow access via topic
CREATE POLICY "Allow source access" ON sources FOR ALL USING (true);

-- Content Progress: Allow access for session
CREATE POLICY "Allow progress access" ON content_progress FOR ALL USING (true);

-- AI Generations: Allow access via topic
CREATE POLICY "Allow ai generation access" ON ai_generations FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- Uncomment the following lines if you want some test data

/*
-- Sample session
INSERT INTO sessions (id, settings, topic_count) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '{"timezone": "UTC", "language": "en"}', 0);

-- Sample topic
INSERT INTO topics (id, session_id, title, source_type) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Machine Learning Basics', 'topic');
*/

-- Success message
SELECT 'Database schema created successfully! All tables and indexes are ready.' as message;
