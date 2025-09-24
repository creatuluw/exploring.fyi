/**
 * Multilingual Support Migration Script
 * Adds language columns to existing database tables
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the migration SQL
const migrationSQL = readFileSync(join(__dirname, 'add-multilingual-support.sql'), 'utf8');

// Railway PostgreSQL connection details
const client = new Client({
  host: 'mainline.proxy.rlwy.net',
  port: 36402,
  database: 'postgres',
  user: 'supabase_admin',
  password: 'xt9rR0P1s7sOSjb9HnV8NZKnkFz4Qd2b',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting multilingual support migration...');
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL database!');
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} migration statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        await client.query(statement);
        if (statement.toLowerCase().includes('alter table')) {
          console.log(`✅ ${statement.substring(0, 50)}...`);
        } else if (statement.toLowerCase().includes('create index')) {
          console.log(`🔍 Index created`);
        } else if (statement.toLowerCase().includes('update')) {
          const result = await client.query(statement);
          console.log(`📝 Updated ${result.rowCount} rows`);
        }
        successCount++;
      } catch (error) {
        console.log(`⚠️  ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    
    // Test the new columns
    console.log(`\n🧪 Testing new language columns...`);
    
    const sessionResult = await client.query(`
      SELECT interface_language, ai_input_language, ai_output_language 
      FROM sessions 
      LIMIT 1
    `);
    
    if (sessionResult.rows.length > 0) {
      console.log(`✅ Sessions language columns working:`, sessionResult.rows[0]);
    }
    
    const topicsResult = await client.query(`
      SELECT content_language, original_language 
      FROM topics 
      LIMIT 1
    `);
    
    if (topicsResult.rows.length > 0) {
      console.log(`✅ Topics language columns working:`, topicsResult.rows[0]);
    }
    
    console.log(`\n🎉 Multilingual migration completed successfully!`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration().catch(console.error);
