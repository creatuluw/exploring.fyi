# Database and Supabase Guide

This guide covers how to use the database and Supabase infrastructure in the exploring.fyi application for both development and production purposes.

## Overview

The application uses **Supabase** deployed on **Railway** as the primary database and backend infrastructure. This provides:

- **PostgreSQL Database** - Primary data storage
- **PostgREST API** - Auto-generated REST API from database schema
- **Real-time subscriptions** - Live data updates
- **Row Level Security (RLS)** - Fine-grained access control
- **Authentication** - User management (currently using anonymous sessions)

## Database Architecture

### Core Tables

#### Legacy Tables (Existing)
- `sessions` - Anonymous user sessions
- `topics` - Main topic/subject entries
- `mind_maps` - Mind map visualizations and nodes
- `sources` - Reference materials and citations
- `content_progress` - User reading progress tracking
- `paragraph_progress` - Detailed paragraph-level progress
- `paragraph_qa` - Question/answer pairs for paragraphs
- `ai_generations` - AI content generation history

#### New Tables (AI Flow Redesign)
- `chapters` - Structured table of contents
- `paragraphs` - Individual content sections
- `checks_done` - Chapter assessment results

### Database Schema Relationships

```
topics (1) → (many) chapters → (many) paragraphs
sessions (1) → (many) checks_done
chapters (1) → (many) checks_done
```

## Connection Details

### Production (Railway Supabase)

**Supabase REST API:**
- **URL**: `https://kong-production-5096.up.railway.app`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTgxNDY0MDAsImV4cCI6MTkxNTkxMjgwMH0.RKfQElqFwp2xN9IHSTQEhyt7tOFe5bYhR1n7CQNHrdc`
- **Anonymous Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ`

**Direct PostgreSQL Connection:**
```
postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres
```

### Environment Variables

Set these in your `.env` file:

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://kong-production-5096.up.railway.app
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ

# For server-side operations (migrations, admin tasks)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTgxNDY0MDAsImV4cCI6MTkxNTkxMjgwMH0.RKfQElqFwp2xN9IHSTQEhyt7tOFe5bYhR1n7CQNHrdc

# Direct PostgreSQL (for migrations, debugging)
DATABASE_URL=postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres
```

## Development Setup

### 1. Railway CLI Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to the exploring.fyi project
railway link
# Select: Hoi Pippeloi → exploring.fyi → production

# Get environment variables for any service
railway service  # Select PostgreSQL or Supabase Studio
railway variables
```

### 2. Database Client Setup

The application uses the Supabase JavaScript client configured in `src/lib/database/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### 3. Database Service Layers

Use the existing service layers for database operations:

```typescript
// Import service layers
import { SessionsService } from '$lib/database/sessions';
import { TopicsService } from '$lib/database/topics';
import { ChaptersService } from '$lib/database/chapters';
import { ParagraphsService } from '$lib/database/paragraphs';
import { ChecksService } from '$lib/database/checksService';

// Example usage
const sessionsService = new SessionsService();
const session = await sessionsService.createSession();

const topicsService = new TopicsService();
const topic = await topicsService.createTopic(session.id, 'Machine Learning');

const chaptersService = new ChaptersService();
const chapters = await chaptersService.getChaptersByTopic(topic.id);
```

## Database Operations

### Creating New Tables

1. **Write SQL migration file** in `scripts/` directory
2. **Update TypeScript types** in `src/lib/database/supabase.ts`
3. **Create service layer** in `src/lib/database/`
4. **Run migration**:

```bash
# Using Node.js migration runner
node scripts/run-migrations-via-railway.js

# Or using Railway CLI + PostgreSQL client
railway connect postgres  # If available
# Then run SQL files manually
```

### Row Level Security (RLS)

All tables have RLS enabled with permissive policies for development. Example:

```sql
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow chapters access" ON chapters FOR ALL USING (true);
```

For production, implement more restrictive policies based on session ownership:

```sql
CREATE POLICY "Users can access their own data" ON chapters 
FOR ALL USING (
  topic_id IN (
    SELECT id FROM topics WHERE session_id = current_setting('app.session_id')
  )
);
```

### Indexes and Performance

Key indexes are created for:
- Topic lookups: `idx_chapters_topic_id`, `idx_paragraphs_topic_id`
- Chapter relationships: `idx_paragraphs_chapter_id`
- Session lookups: `idx_checks_done_session_id`

## API Endpoints

### REST API (Auto-generated by PostgREST)

Access tables directly via REST:

```typescript
// GET all chapters for a topic
const { data, error } = await supabase
  .from('chapters')
  .select('*')
  .eq('topic_id', topicId)
  .order('index');

// INSERT new paragraph
const { data, error } = await supabase
  .from('paragraphs')
  .insert({
    topic_id: topicId,
    chapter_id: chapterId,
    index: 0,
    content: 'Paragraph content...',
    is_generated: true,
    generated_at: new Date().toISOString()
  });
```

### Custom API Endpoints

Application-specific endpoints in `src/routes/api/`:

- `POST /api/generate-toc` - Generate Table of Contents with streaming
- `POST /api/generate-paragraph` - Generate individual paragraph content
- `POST /api/chapter-check` - Chapter assessment with AI questions
- `POST /api/analyze-topic` - Topic analysis and mind map generation
- `POST /api/expand-concept` - Concept expansion for mind maps

## Data Flow Architecture

### AI Content Generation Flow

1. **Topic Creation** → `topics` table
2. **ToC Generation** → `chapters` + `paragraphs` (stubs)
3. **On-Demand Paragraph Generation** → Update `paragraphs.content`
4. **Chapter Assessment** → `checks_done` table
5. **Progress Tracking** → `content_progress`, `paragraph_progress`

### Caching Strategy

- **Mind Maps**: Cached in `mind_maps` table with JSON structure
- **AI Generations**: Logged in `ai_generations` for replay/debugging
- **Content Progress**: Real-time tracking in `content_progress`

## Database Administration

### Using pgAdmin

1. **Connect using the direct PostgreSQL URL**:
   ```
   Host: shinkansen.proxy.rlwy.net
   Port: 15819
   Database: postgres
   Username: supabase_admin
   Password: b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6
   ```

2. **View table structure** in the public schema
3. **Run queries and migrations** via Query Tool

### Using Supabase Studio

Access the web interface via Railway:
1. Go to Railway dashboard → exploring.fyi project
2. Open Supabase Studio service
3. Use the provided domain to access the admin panel

### Database Backup and Restore

```bash
# Backup
pg_dump "postgresql://supabase_admin:PASSWORD@shinkansen.proxy.rlwy.net:15819/postgres" > backup.sql

# Restore
psql "postgresql://supabase_admin:PASSWORD@shinkansen.proxy.rlwy.net:15819/postgres" < backup.sql
```

## Testing and Development

### Local Development

The application connects directly to the production Railway database. For local development:

1. **Use environment variables** to point to Railway Supabase
2. **Create test data** with recognizable session IDs
3. **Clean up test data** regularly

### Migration Testing

Before running migrations on production:

1. **Test locally** with a copy of the database
2. **Use transactions** in migration scripts
3. **Create rollback scripts** for each migration
4. **Backup database** before major schema changes

### Debugging Database Issues

```typescript
// Enable query logging in Supabase client
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  global: { headers: { 'x-application-name': 'exploring-fyi-debug' } }
});

// Check connection
const { data, error } = await supabase
  .from('sessions')
  .select('count(*)')
  .single();

console.log('Database connection:', error ? 'Failed' : 'Success');
```

## Security Considerations

### Environment Variables

- **Never commit** service role keys to version control
- **Use different keys** for different environments
- **Rotate keys** regularly in production

### RLS Policies

- **Review policies** before deploying to production
- **Test access control** with different user contexts
- **Monitor policy performance** for complex queries

### Data Privacy

- **Anonymize session data** in development
- **Implement data retention policies**
- **Follow GDPR guidelines** for user data

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```bash
   # Check Railway service status
   railway status
   
   # Restart services if needed
   railway redeploy
   ```

2. **RLS Policy Errors**
   ```sql
   -- Temporarily disable RLS for debugging
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   
   -- Re-enable after fixing
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

3. **Migration Failures**
   ```bash
   # Check existing table structure
   node scripts/check-db-schema.js
   
   # Run migrations step by step
   node scripts/run-migrations-via-railway.js
   ```

### Performance Monitoring

- Monitor query performance in Supabase Studio
- Use `EXPLAIN ANALYZE` for slow queries
- Add indexes for frequently queried columns
- Consider materialized views for complex aggregations

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgREST API Reference](https://postgrest.org/en/stable/)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

*Last updated: December 2024*
*For questions or issues, refer to the project documentation or create an issue in the repository.*
