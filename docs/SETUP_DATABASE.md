# 🗄️ Database Setup Instructions

The database tables don't exist yet and need to be created in your Railway Supabase instance. Here are the steps:

## 🎯 Quick Setup Options

### Option 1: Use Supabase Dashboard (Recommended)

1. **Access Supabase Dashboard:**
   - Go to: `https://kong-production-413c.up.railway.app/studio/`
   - Or access through Railway dashboard if available

2. **Open SQL Editor:**
   - Look for "SQL Editor" or "Database" section
   - Create a new query

3. **Run the Schema Script:**
   - Copy the contents of `database-schema.sql` 
   - Paste and execute in SQL Editor

### Option 2: Use Railway Database Access

1. **Access Railway Dashboard:**
   - Go to your Railway project
   - Find the PostgreSQL database service
   - Look for database connection details

2. **Connect via psql or Database Tool:**
   ```bash
   psql -h [hostname] -U [username] -d [database] -p [port]
   ```

3. **Run the Schema:**
   - Execute the `database-schema.sql` file

## 📋 What Tables Will Be Created

### Core Tables:
- **`sessions`** - Anonymous user sessions
- **`topics`** - Explored topics and analysis results  
- **`mind_maps`** - Complete mind map structures (nodes, edges)
- **`sources`** - Source URLs with credibility scores
- **`content_progress`** - Reading progress and time tracking
- **`ai_generations`** - AI generation metadata

### Features Enabled:
- ✅ Full topic exploration history
- ✅ Mind map persistence with resume functionality
- ✅ Session continuity across browser restarts
- ✅ Progress tracking (time spent, reading progress)
- ✅ Source credibility tracking
- ✅ Learning analytics and insights

## 🧪 Test Database Connection

After creating tables, test with:

```javascript
// In browser console after visiting the app:
localStorage.getItem('explore_session_id') // Should show session ID
```

## 🚨 Current Status

❌ **Tables don't exist yet** - Schema needs to be created  
✅ **Application code ready** - All services implemented  
✅ **Railway Supabase operational** - Database accessible  

## 🔧 Manual Table Creation

If the dashboard isn't accessible, here are the essential tables to create manually:

### 1. Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT NULL,
    settings JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    topic_count INTEGER DEFAULT 0
);
```

### 2. Topics Table  
```sql
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_url TEXT DEFAULT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
    mind_map_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Mind Maps Table
```sql
CREATE TABLE mind_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    layout_data JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

*Continue with remaining tables from `database-schema.sql`*

## ✅ After Setup

Once tables are created:

1. **Test the app** - Session will be created automatically
2. **Check `/history`** - Should show empty state initially  
3. **Explore a topic** - Data will be saved to database
4. **Resume functionality** - Previous topics will be accessible

## 🆘 Need Help?

If you can't access the Supabase dashboard:
1. Check Railway project for database connection details
2. Look for environment variables with database credentials  
3. Try accessing `https://kong-production-413c.up.railway.app/studio/` directly
4. Alternative: Use a PostgreSQL client with connection details

**Next Step**: Create the database schema, then the full history system will be operational!
