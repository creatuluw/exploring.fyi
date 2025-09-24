# Slug-Based Navigation Test Plan

## Test Cases for Slug Functionality

### 1. Database Migration Test
**Purpose**: Verify that the migration script properly adds slug fields

**Steps**:
1. Run the migration script: `scripts/add-slug-fields-migration.sql`
2. Verify that both `topics` and `mind_maps` tables have `slug` columns
3. Check that existing records get auto-generated slugs
4. Verify unique constraints work properly

**Expected Results**:
- Topics table has `slug` field with unique constraint per session
- Mind maps table has `slug` field with global unique constraint
- Auto-generation triggers work for new records
- Existing records are populated with slugs

### 2. Topic Slug Generation Test
**Purpose**: Test that topics get proper slugs when created

**Steps**:
1. Create a new topic with title "Machine Learning Basics"
2. Verify slug is generated as "machine-learning-basics"
3. Create another topic with same title in same session
4. Verify second topic gets "machine-learning-basics-2"

**Expected Results**:
- Slugs are URL-friendly (lowercase, hyphens)
- Conflicts are resolved with numbered suffixes
- Slugs are unique within session scope

### 3. Mind Map Slug Generation Test
**Purpose**: Test that mind maps get proper slugs based on topic slugs

**Steps**:
1. Create a mind map for topic with slug "machine-learning-basics"
2. Verify mind map slug is "machine-learning-basics-mindmap"
3. Create another mind map for same topic
4. Verify second mind map gets "machine-learning-basics-mindmap-2"

**Expected Results**:
- Mind map slugs derive from topic slugs
- Global uniqueness is maintained
- Conflicts are resolved with numbered suffixes

### 4. History Dashboard Navigation Test
**Purpose**: Test that "Mindmap" buttons use slug-based navigation

**Steps**:
1. Go to `/history` page
2. Find a topic card with an existing mind map
3. Click the "Mindmap" button
4. Verify navigation goes to `/mindmap/{slug}` URL
5. Verify mind map loads correctly

**Expected Results**:
- Clean URLs with slugs instead of UUIDs
- Direct navigation to mind map view
- Proper mind map loading and display

### 5. Mindmap Route Test
**Purpose**: Test the new `/mindmap/[slug]` route

**Steps**:
1. Navigate directly to `/mindmap/some-topic-mindmap`
2. Verify mind map loads by slug
3. Test back navigation to history
4. Test error handling for non-existent slugs

**Expected Results**:
- Mind map loads correctly from slug
- Proper error handling for 404 cases
- Navigation works smoothly

### 6. Explore Page Slug Support Test
**Purpose**: Test that explore page handles both UUIDs and slugs

**Steps**:
1. Navigate to `/explore?topic=some-topic-slug&resume=true`
2. Verify topic loads by slug
3. Navigate to `/explore?topic={uuid}&resume=true`
4. Verify fallback to UUID loading works

**Expected Results**:
- Both slug and UUID navigation work
- Proper fallbacks when slug lookup fails
- Session context is handled correctly

## Manual Testing Checklist

- [ ] Run database migration script
- [ ] Create new topics and verify slug generation
- [ ] Create mind maps and verify slug generation
- [ ] Test history dashboard mindmap navigation
- [ ] Test direct mindmap URL access
- [ ] Test explore page with slug parameters
- [ ] Test error handling for invalid slugs
- [ ] Verify unique constraints work
- [ ] Test conflict resolution (numbered suffixes)
- [ ] Verify clean URLs in browser address bar

## Automated Test Commands

```bash
# Run the migration
psql $DATABASE_URL -f scripts/add-slug-fields-migration.sql

# Test basic connectivity
node tests/test-slug-functionality.js
```

## Notes
- All tests should pass without breaking existing functionality
- UUIDs should still work as fallbacks
- Performance should remain good with indexed slug lookups
- URL structure should be clean and SEO-friendly
