// Supabase-compatible API service for Railway
// Using SQLite for reliable deployment and compatibility
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || '/app/data/supabase.db';
let db;

try {
  // Ensure directory exists
  const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  console.log(`📊 Database initialized: ${dbPath}`);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Initialize database schema
function initializeSchema() {
  try {
    console.log('🔧 Creating database schema...');
    
    // Create tables based on our init_schema.sql
    const createTables = `
      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        topic_count INTEGER DEFAULT 0,
        settings TEXT DEFAULT '{}'
      );

      -- Topics table
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        mind_map_data TEXT,
        source_url TEXT,
        source_type TEXT
      );

      -- Sources table
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        domain TEXT,
        credibility_score INTEGER DEFAULT 50,
        source_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}'
      );

      -- Content progress table
      CREATE TABLE IF NOT EXISTS content_progress (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
        section_id TEXT NOT NULL,
        progress_percentage INTEGER DEFAULT 0,
        time_spent_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        last_viewed DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Mind maps table
      CREATE TABLE IF NOT EXISTS mind_maps (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        layout_data TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Nodes table
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        mind_map_id TEXT REFERENCES mind_maps(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        label TEXT NOT NULL,
        node_type TEXT NOT NULL,
        position_x REAL,
        position_y REAL,
        data TEXT DEFAULT '{}',
        parent_node_id TEXT,
        depth_level INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User preferences table
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        preference_key TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- AI generations table
      CREATE TABLE IF NOT EXISTS ai_generations (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        ai_model TEXT NOT NULL,
        generated_content TEXT NOT NULL,
        input_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processing_time_ms INTEGER
      );

      -- Insert default session
      INSERT OR IGNORE INTO sessions (id, user_id, settings) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'anonymous', '{"theme": "light", "language": "en"}');
    `;

    db.exec(createTables);
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
  }
}

// Initialize schema on startup
initializeSchema();

// Health check endpoint for Railway
app.get("/api/platform/profile", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "supabase-compatible-railway",
    timestamp: new Date().toISOString(),
    database: "SQLite",
    tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length
  });
});

// Database info endpoint
app.get("/api/database/info", async (req, res) => {
  try {
    const version = db.prepare("SELECT sqlite_version() as version").get();
    res.json({ version: `SQLite ${version.version}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supabase-compatible REST API endpoints
app.get("/rest/v1/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const limit = req.query.limit || 100;
    
    const stmt = db.prepare(`SELECT * FROM ${table} LIMIT ?`);
    const rows = stmt.all(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/rest/v1/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;
    
    // Add ID if not provided
    if (!data.id) {
      data.id = uuidv4();
    }
    
    // Convert JSON objects to strings for SQLite
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        data[key] = JSON.stringify(data[key]);
      }
    });
    
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const stmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
    const result = stmt.run(...values);
    
    // Return the inserted row
    const selectStmt = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`);
    const insertedRow = selectStmt.get(result.lastInsertRowid);
    res.json(insertedRow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/rest/v1/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const { id } = req.query;
    const data = req.body;
    
    // Convert JSON objects to strings for SQLite
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        data[key] = JSON.stringify(data[key]);
      }
    });
    
    const setClauses = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const stmt = db.prepare(`UPDATE ${table} SET ${setClauses} WHERE id = ?`);
    stmt.run(...values);
    
    // Return the updated row
    const selectStmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    const updatedRow = selectStmt.get(id);
    res.json(updatedRow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/rest/v1/:table", async (req, res) => {
  try {
    const { table } = req.params;
    const { id } = req.query;
    
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const result = stmt.run(id);
    res.json({ deleted: result.changes > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth endpoints (mock for compatibility)
app.post("/auth/v1/token", (req, res) => {
  const token = jwt.sign({ 
    sub: 'anonymous',
    role: 'anon',
    iss: 'supabase-railway'
  }, 'railway-jwt-secret', { expiresIn: '1h' });
  
  res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: 'anonymous', role: 'anon' }
  });
});

// Homepage with API documentation
app.get("/", (req, res) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  
  const html = `
    <html>
      <head><title>Supabase-Compatible API on Railway</title></head>
      <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🚀 Supabase-Compatible API on Railway</h1>
        <p>✅ Database: SQLite (${tables.length} tables)</p>
        <p>🌐 Public URL: ${process.env.RAILWAY_PUBLIC_URL || req.get('host')}</p>
        <p>📖 Based on: <a href="https://supabase.com/docs/guides/self-hosting">Supabase Self-Hosting Guide</a></p>
        
        <h2>🔗 API Endpoints:</h2>
        <ul>
          <li><a href="/api/platform/profile">Health Check</a></li>
          <li><a href="/api/database/info">Database Info</a></li>
          <li><strong>REST API:</strong> <code>GET/POST/PATCH/DELETE /rest/v1/{table}</code></li>
          <li><strong>Auth API:</strong> <code>POST /auth/v1/token</code></li>
        </ul>
        
        <h2>📊 Available Tables:</h2>
        <ul>
          ${tables.map(t => `<li><a href="/rest/v1/${t.name}">${t.name}</a></li>`).join('')}
        </ul>
        
        <h2>🔐 Supabase Client Configuration:</h2>
        <pre>
const supabaseUrl = 'https://${req.get('host')}'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        </pre>
        
        <h2>✨ Features:</h2>
        <ul>
          <li>✅ Supabase-compatible REST API</li>
          <li>✅ SQLite database with full schema</li>
          <li>✅ CRUD operations on all tables</li>
          <li>✅ JSON data support</li>
          <li>✅ Health monitoring</li>
        </ul>
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Supabase-compatible Railway service running on port ${port}`);
  console.log(`🗄️ Database: SQLite at ${dbPath}`);
  console.log(`🌐 Public URL: ${process.env.RAILWAY_PUBLIC_URL || 'Not set'}`);
  console.log(`📖 Based on official Supabase self-hosting: https://supabase.com/docs/guides/self-hosting`);
});