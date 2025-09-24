-- Migration: Add multilingual support to database
-- File: scripts/add-multilingual-support.sql
-- Purpose: Add language columns to support multilingual content generation and storage

BEGIN;

-- Add language columns to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS interface_language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS ai_input_language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS ai_output_language VARCHAR(5) DEFAULT 'en';

-- Add language metadata to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS content_language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) DEFAULT 'en';

-- Add multilingual content support to mind_maps
ALTER TABLE mind_maps 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Add language tracking to ai_generations
ALTER TABLE ai_generations 
ADD COLUMN IF NOT EXISTS input_language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS output_language VARCHAR(5) DEFAULT 'en';

-- Create indexes for language-based queries
CREATE INDEX IF NOT EXISTS idx_topics_content_language ON topics(content_language);
CREATE INDEX IF NOT EXISTS idx_sessions_interface_language ON sessions(interface_language);
CREATE INDEX IF NOT EXISTS idx_mind_maps_language ON mind_maps(language);
CREATE INDEX IF NOT EXISTS idx_ai_generations_output_language ON ai_generations(output_language);

-- Update existing records to have 'en' as default language
UPDATE sessions SET 
  interface_language = 'en',
  ai_input_language = 'en',
  ai_output_language = 'en'
WHERE interface_language IS NULL OR ai_input_language IS NULL OR ai_output_language IS NULL;

UPDATE topics SET 
  content_language = 'en',
  original_language = 'en'
WHERE content_language IS NULL OR original_language IS NULL;

UPDATE mind_maps SET language = 'en' WHERE language IS NULL;

UPDATE ai_generations SET 
  input_language = 'en',
  output_language = 'en'
WHERE input_language IS NULL OR output_language IS NULL;

-- Add check constraints for supported languages
ALTER TABLE sessions 
ADD CONSTRAINT check_interface_language CHECK (interface_language IN ('en', 'nl', 'es')),
ADD CONSTRAINT check_ai_input_language CHECK (ai_input_language IN ('en', 'nl', 'es')),
ADD CONSTRAINT check_ai_output_language CHECK (ai_output_language IN ('en', 'nl', 'es'));

ALTER TABLE topics 
ADD CONSTRAINT check_content_language CHECK (content_language IN ('en', 'nl', 'es')),
ADD CONSTRAINT check_original_language CHECK (original_language IN ('en', 'nl', 'es'));

ALTER TABLE mind_maps 
ADD CONSTRAINT check_language CHECK (language IN ('en', 'nl', 'es'));

ALTER TABLE ai_generations 
ADD CONSTRAINT check_input_language CHECK (input_language IN ('en', 'nl', 'es')),
ADD CONSTRAINT check_output_language CHECK (output_language IN ('en', 'nl', 'es'));

COMMIT;

-- Log completion
SELECT 'Multilingual support migration completed successfully' as status;
