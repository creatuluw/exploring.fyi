# 🚂 Get Railway Database Connection Info

Since the Supabase Studio is showing authentication errors, let's connect directly to your Railway PostgreSQL database to create the tables.

## 📋 Step 1: Get Database Credentials

### From Railway Dashboard:

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Open your `exploring.fyi` project

2. **Find PostgreSQL Service:**
   - Look for the PostgreSQL service (might be labeled as "Postgres" or "Database")
   - Click on it

3. **Get Connection Details:**
   - Go to **Variables** tab
   - Look for these environment variables:
     - `DATABASE_URL` (complete connection string)
     - OR individual variables:
       - `PGHOST` (hostname)
       - `PGPORT` (port, usually 5432)
       - `PGUSER` (username, usually postgres)
       - `PGPASSWORD` (password)
       - `PGDATABASE` (database name, usually railway)

## 🔧 Step 2: Connect to Database

### Option A: Use Railway CLI (Easiest)

```bash
# Install Railway CLI if not installed
npm install -g @railway/cli

# Login to Railway
railway login

# Connect to your project
railway link

# Access PostgreSQL directly
railway run psql $DATABASE_URL
```

Then paste the contents of `database-schema.sql` and run it.

### Option B: Use Database Tool

If you have a PostgreSQL client like pgAdmin, DBeaver, or psql:

```bash
psql "postgresql://username:password@host:port/database"
```

### Option C: Update and Run Script

1. **Edit `create-tables-railway.js`:**
   - Replace the placeholder values with your actual credentials
   - Update the `dbConfig` object

2. **Install pg package:**
   ```bash
   npm install pg
   ```

3. **Run the script:**
   ```bash
   node create-tables-railway.js
   ```

## 🎯 Expected Result

After successfully running the database schema, you should see:

```
✅ sessions
✅ topics  
✅ mind_maps
✅ sources
✅ content_progress
✅ ai_generations
```

## 🧪 Test After Setup

1. **Start your webapp:**
   ```bash
   npm run dev
   ```

2. **Visit the app** - It should create a session automatically

3. **Check `/history`** - Should show empty state initially

4. **Explore a topic** - Data should now be saved to the database!

## 🆘 If You Need Help

**Can't find Railway dashboard?**
- Check your email for Railway signup confirmation
- Look for the project in your Railway account

**Still getting authentication errors?**
- The Kong error suggests the Supabase services might need configuration
- Direct PostgreSQL access bypasses this issue

**Tables not creating?**
- Check PostgreSQL connection details
- Ensure the database service is running in Railway
- Try the Railway CLI approach first

Once the database schema is created, your entire user history system will be operational! 🎉
