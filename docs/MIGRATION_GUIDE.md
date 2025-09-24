# Migration Guide: Chapters & Paragraphs Schema

This guide walks through migrating from the current content structure to the new normalized chapters and paragraphs schema.

## Overview

The new schema implements the flow described in `app-flow.md`:
- ToC-first generation (chapters with descriptions)
- On-demand paragraph generation (sequential, gated)
- Chapter assessments with AI scoring

## Migration Steps

### 1. Run Database Migrations

#### Option A: Using Node.js Script (Recommended)
```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run migrations
node scripts/run-chapter-migrations.js
```

#### Option B: Manual SQL Execution
```bash
# Connect to Railway Supabase
psql "postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres"

# Run migrations
\i scripts/add-chapters-and-paragraphs.sql
\i scripts/add-checks-done.sql
```

### 2. Verify Tables Created

Check that the following tables exist with proper structure:
- `chapters` (with unique topic_id, index constraint)
- `paragraphs` (with unique chapter_id, index constraint)
- `checks_done` (with foreign keys to sessions, topics, chapters)

### 3. Update Application Code

The migration includes:
- New TypeScript types in `src/lib/types/index.ts`
- Database service layers (next tasks)
- API endpoints for ToC and paragraph generation (next tasks)

### 4. Data Migration (Optional)

To migrate existing content to the new structure:
1. Extract sections from existing `topics.mind_map_data`
2. Create chapter records with index and title
3. Create paragraph stubs (is_generated = false)
4. Optionally populate content field for already-generated sections

## Testing

After migration, verify:
- Tables exist and have proper constraints
- RLS policies allow anonymous access
- Triggers update `updated_at` fields
- Foreign key relationships work correctly

## Rollback

To rollback the migration:
```sql
DROP TABLE IF EXISTS checks_done CASCADE;
DROP TABLE IF EXISTS paragraphs CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
```

Note: This will lose any data stored in these tables.
