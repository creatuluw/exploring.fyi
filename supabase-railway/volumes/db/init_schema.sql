-- Initialize Supabase Schema for Railway Deployment
-- This file creates the essential schema needed for our exploring.fyi app

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_jsonb_ops";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create our application tables
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    topic_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mind_map_data JSONB,
    source_url TEXT,
    source_type TEXT
);

CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    domain TEXT,
    credibility_score INTEGER DEFAULT 50,
    source_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, topic_id, section_id)
);

CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    layout_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    label TEXT NOT NULL,
    node_type TEXT NOT NULL,
    position_x FLOAT,
    position_y FLOAT,
    data JSONB DEFAULT '{}'::jsonb,
    parent_node_id TEXT,
    depth_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mind_map_id, node_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, preference_key)
);

CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    ai_model TEXT NOT NULL,
    generated_content JSONB NOT NULL,
    input_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_topics_session_id ON topics(session_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_sources_domain ON sources(domain);
CREATE INDEX IF NOT EXISTS idx_content_progress_session_topic ON content_progress(session_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_topic_id ON mind_maps(topic_id);
CREATE INDEX IF NOT EXISTS idx_nodes_mind_map_id ON nodes(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_topic_id ON ai_generations(topic_id);

-- Row Level Security (RLS) policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow all for now since we're using session-based access)
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on topics" ON topics FOR ALL USING (true);
CREATE POLICY "Allow all operations on sources" ON sources FOR ALL USING (true);
CREATE POLICY "Allow all operations on content_progress" ON content_progress FOR ALL USING (true);
CREATE POLICY "Allow all operations on mind_maps" ON mind_maps FOR ALL USING (true);
CREATE POLICY "Allow all operations on nodes" ON nodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_preferences" ON user_preferences FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_generations" ON ai_generations FOR ALL USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Insert test data
INSERT INTO sessions (id, user_id, settings) 
VALUES ('00000000-0000-0000-0000-000000000001', 'anonymous', '{"theme": "light", "language": "en"}') 
ON CONFLICT (id) DO NOTHING;

-- Create a trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
