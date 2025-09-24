#!/usr/bin/env node

/**
 * Run migration to convert database from UUID-based to text-based slug IDs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection from environment or default Railway config
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres';

console.log('🚀 Starting migration to text-based slug IDs...');

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: false
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrate-to-text-ids.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Read migration file:', migrationPath);
    
    // Execute the migration
    console.log('🔄 Executing migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the new table structure
    console.log('\n📊 Verifying new table structure...');
    
    const tablesCheck = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('chapters', 'paragraphs', 'checks_done')
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log('\n📋 New table structure:');
    const tables = {};
    tablesCheck.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable
      });
    });
    
    Object.entries(tables).forEach(([tableName, columns]) => {
      console.log(`\n  ${tableName}:`);
      columns.forEach(col => {
        console.log(`    - ${col.column}: ${col.type} ${col.nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    });
    
    console.log('\n🎉 Migration to text-based slug IDs completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the application with the new schema');
    console.log('2. Update any remaining services to use text-based IDs');
    console.log('3. Verify slug uniqueness and collision handling');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('❌ Error details:', error.message);
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration().catch(console.error);
