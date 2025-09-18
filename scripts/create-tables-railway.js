/**
 * Alternative Database Setup for Railway
 * Uses Railway's direct PostgreSQL connection
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

console.log('🚂 Railway Database Setup - Alternative Approach');

// You'll need to get these from your Railway project dashboard
// Go to your Railway project > PostgreSQL service > Variables tab
const dbConfig = {
  // Replace these with your actual Railway PostgreSQL connection details
  host: 'YOUR_RAILWAY_DB_HOST',
  port: 5432,
  database: 'railway', // or whatever your database name is
  user: 'postgres',
  password: 'YOUR_RAILWAY_DB_PASSWORD',
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('📋 To get your Railway database credentials:');
console.log('1. Go to your Railway project dashboard');
console.log('2. Click on the PostgreSQL service');
console.log('3. Go to Variables tab');
console.log('4. Look for: DATABASE_URL, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE');
console.log('');

async function createTablesDirectly() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read schema file
    const schema = readFileSync('./database-schema.sql', 'utf8');
    
    // Execute schema
    console.log('📊 Creating database schema...');
    await client.query(schema);
    
    console.log('🎉 Database schema created successfully!');
    
    // Test the tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure to update the database credentials in this file');
  } finally {
    await client.end();
  }
}

// Alternative: Show connection string format
function showConnectionInstructions() {
  console.log('🔧 Railway Database Connection Options:');
  console.log('');
  console.log('Option 1: Use Railway DATABASE_URL');
  console.log('  - Find DATABASE_URL in your Railway PostgreSQL service variables');
  console.log('  - Format: postgresql://user:password@host:port/database');
  console.log('');
  console.log('Option 2: Use individual connection parameters');
  console.log('  - PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE');
  console.log('');
  console.log('Option 3: Use Railway CLI');
  console.log('  - railway login');
  console.log('  - railway connect');
  console.log('  - railway run psql');
  console.log('');
  console.log('Then paste the contents of database-schema.sql');
}

// Check if we have credentials configured
if (dbConfig.host === 'YOUR_RAILWAY_DB_HOST') {
  showConnectionInstructions();
} else {
  createTablesDirectly();
}

export { createTablesDirectly, showConnectionInstructions };
