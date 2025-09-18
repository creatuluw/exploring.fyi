const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/platform/profile", (req, res) => {
  res.json({ status: "ok", service: "supabase-studio" });
});

// Database info endpoint
app.get("/api/database/info", async (req, res) => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();
    const result = await client.query("SELECT version()");
    client.release();
    res.json({ version: result.rows[0].version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple homepage
app.get("/", (req, res) => {
  const html = `
    <html>
      <head><title>Supabase Studio - Railway</title></head>
      <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🚀 Supabase Studio on Railway</h1>
        <p>Database URL: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}</p>
        <p>Public URL: ${process.env.RAILWAY_PUBLIC_URL || "Not set"}</p>
        <h2>API Endpoints:</h2>
        <ul>
          <li><a href="/api/platform/profile">Health Check</a></li>
          <li><a href="/api/database/info">Database Info</a></li>
        </ul>
        <h2>Environment:</h2>
        <pre>JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "Not set"}
ANON_KEY: ${process.env.ANON_KEY ? "Set" : "Not set"}
SERVICE_ROLE_KEY: ${process.env.SERVICE_ROLE_KEY ? "Set" : "Not set"}</pre>
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Supabase Studio running on port ${port}`);
  console.log(`Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`);
  console.log(`Public URL: ${process.env.RAILWAY_PUBLIC_URL || "Not set"}`);
});
