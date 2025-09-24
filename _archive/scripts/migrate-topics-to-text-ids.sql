-- Migration to convert topics table from UUID to text-based slug IDs
-- This aligns with the text-based ID strategy used in other content tables

BEGIN;

-- Step 1: Create a new topics table with text-based IDs
CREATE TABLE IF NOT EXISTS topics_new (
  id TEXT PRIMARY KEY, -- Format: "session_id:topic_slug"
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT DEFAULT NULL,
  source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
  mind_map_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create helper function to generate slug from title
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

-- Step 3: Migrate existing data if topics table exists and has data
DO $$
DECLARE
  topic_record RECORD;
  new_id TEXT;
BEGIN
  -- Check if old topics table exists and has data
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'topics') THEN
    -- Migrate each existing topic
    FOR topic_record IN SELECT * FROM topics LOOP
      -- Generate new text-based ID
      new_id := topic_record.session_id::TEXT || ':' || generate_slug(topic_record.title);
      
      -- Insert into new table
      INSERT INTO topics_new (id, session_id, title, source_url, source_type, mind_map_data, created_at, updated_at)
      VALUES (new_id, topic_record.session_id, topic_record.title, topic_record.source_url, topic_record.source_type, topic_record.mind_map_data, topic_record.created_at, topic_record.updated_at);
      
      -- Update mind_maps table to reference new topic ID
      UPDATE mind_maps SET topic_id = new_id WHERE topic_id = topic_record.id::TEXT;
      
      -- Update sources table to reference new topic ID  
      UPDATE sources SET topic_id = new_id WHERE topic_id = topic_record.id::TEXT;
      
      -- Update any other tables that reference the old topic ID
      -- Add more UPDATE statements here if there are other tables referencing topics
      
    END LOOP;
  END IF;
END $$;

-- Step 4: Drop old table and rename new table
DROP TABLE IF EXISTS topics CASCADE;
ALTER TABLE topics_new RENAME TO topics;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_session_id ON topics(session_id);
CREATE INDEX IF NOT EXISTS idx_topics_source_type ON topics(source_type);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);

-- Step 6: Update mind_maps table to use TEXT for topic_id if it's still UUID
DO $$
BEGIN
  -- Check if mind_maps.topic_id is UUID type and convert it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mind_maps' AND column_name = 'topic_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE mind_maps ALTER COLUMN topic_id TYPE TEXT;
  END IF;
END $$;

-- Step 7: Update sources table to use TEXT for topic_id if it's still UUID
DO $$
BEGIN
  -- Check if sources.topic_id is UUID type and convert it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sources' AND column_name = 'topic_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE sources ALTER COLUMN topic_id TYPE TEXT;
  END IF;
END $$;

-- Step 8: Clean up helper function
DROP FUNCTION IF EXISTS generate_slug(TEXT);

-- Step 9: Recreate foreign key constraints
ALTER TABLE mind_maps ADD CONSTRAINT fk_mind_maps_topic_id 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

ALTER TABLE sources ADD CONSTRAINT fk_sources_topic_id 
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;

COMMIT;
