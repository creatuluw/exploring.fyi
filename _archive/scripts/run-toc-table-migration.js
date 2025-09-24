#!/usr/bin/env node

/**
 * Run migration to add the ToC table
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection from environment or default Railway config
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres';

console.log('🚀 Adding ToC table...');

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: false
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add-toc-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Read migration file:', migrationPath);
    
    // Execute the migration
    console.log('🔄 Adding ToC table...');
    await client.query(migrationSQL);
    
    console.log('✅ ToC table added successfully!');
    
    // Verify the new table structure
    console.log('\n📊 Verifying ToC table structure...');
    
    const tableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'toc'
      ORDER BY ordinal_position;
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('\n📋 ToC table structure:');
      tableCheck.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.log('❌ ToC table was not created properly');
    }
    
    console.log('\n🎉 ToC table migration completed successfully!');
    
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
