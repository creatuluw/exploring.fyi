-- Migration to add slug fields to topics and mind_maps tables
-- This enables slug-based navigation for both topics and mindmaps

BEGIN;

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
-- STEP 2: Add slug field to topics table
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

-- =========================================
-- STEP 3: Add slug field to mind_maps table
-- =========================================

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

-- =========================================
-- STEP 4: Populate slugs for existing topics
-- =========================================

-- Update existing topics with slugs generated from their titles
UPDATE topics 
SET slug = generate_slug(title)
WHERE slug IS NULL;

RAISE NOTICE 'Updated % topics with generated slugs', (SELECT COUNT(*) FROM topics WHERE slug IS NOT NULL);

-- =========================================
-- STEP 5: Populate slugs for existing mind_maps
-- =========================================

-- Update existing mind_maps with slugs based on their associated topic
UPDATE mind_maps 
SET slug = t.slug || '-mindmap'
FROM topics t 
WHERE mind_maps.topic_id = t.id 
AND mind_maps.slug IS NULL;

RAISE NOTICE 'Updated % mind_maps with generated slugs', (SELECT COUNT(*) FROM mind_maps WHERE slug IS NOT NULL);

-- =========================================
-- STEP 6: Add constraints and indexes
-- =========================================

-- Make slug NOT NULL for topics (after populating existing records)
ALTER TABLE topics ALTER COLUMN slug SET NOT NULL;

-- Make slug NOT NULL for mind_maps (after populating existing records)
ALTER TABLE mind_maps ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint on topics slug within session
ALTER TABLE topics ADD CONSTRAINT unique_topic_slug_per_session 
  UNIQUE (session_id, slug);

-- Add unique constraint on mind_maps slug globally (since they reference topics)
ALTER TABLE mind_maps ADD CONSTRAINT unique_mindmap_slug 
  UNIQUE (slug);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_session_slug ON topics(session_id, slug);
CREATE INDEX IF NOT EXISTS idx_mind_maps_slug ON mind_maps(slug);

-- =========================================
-- STEP 7: Create trigger to auto-generate slugs for new records
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

-- Create triggers
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

-- =========================================
-- STEP 8: Update updated_at trigger for new columns
-- =========================================

-- Ensure updated_at triggers still work after adding slug columns
-- (These should already exist, but we'll make sure they're working)

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

-- =========================================
-- STEP 9: Verification and summary
-- =========================================

-- Display summary of the migration
DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Topics with slugs: %', (SELECT COUNT(*) FROM topics WHERE slug IS NOT NULL);
  RAISE NOTICE 'Mind maps with slugs: %', (SELECT COUNT(*) FROM mind_maps WHERE slug IS NOT NULL);
  RAISE NOTICE 'Sample topic slugs: %', (
    SELECT STRING_AGG(slug, ', ') 
    FROM (SELECT slug FROM topics LIMIT 5) as sample
  );
  RAISE NOTICE 'Sample mind map slugs: %', (
    SELECT STRING_AGG(slug, ', ') 
    FROM (SELECT slug FROM mind_maps LIMIT 5) as sample
  );
END $$;

COMMIT;

-- Success message
SELECT 'Slug fields migration completed successfully! Both topics and mind_maps now have slug columns with auto-generation triggers.' as result;
