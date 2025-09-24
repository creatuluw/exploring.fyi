#!/usr/bin/env node

// Run chapter, paragraph, and checks_done migrations on Railway Supabase
// Usage: node scripts/run-chapter-migrations.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Railway Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kong-production-5096.up.railway.app';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration(filePath, description) {
  console.log(`\n🔄 Running migration: ${description}`);
  
  try {
    const sql = readFileSync(join(__dirname, filePath), 'utf-8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${description}`);
      console.error('Error:', error);
      return false;
    }
    
    console.log(`✅ Migration completed: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed: ${description}`);
    console.error('Error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting chapter/paragraph migrations...');
  
  const migrations = [
    {
      file: 'add-chapters-and-paragraphs.sql',
      description: 'Add chapters and paragraphs tables with RLS'
    },
    {
      file: 'add-checks-done.sql', 
      description: 'Add checks_done table with RLS'
    }
  ];
  
  let allSuccessful = true;
  
  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.description);
    if (!success) {
      allSuccessful = false;
      break;
    }
  }
  
  if (allSuccessful) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nNew tables created:');
    console.log('- chapters (with RLS and triggers)');
    console.log('- paragraphs (with RLS and triggers)');
    console.log('- checks_done (with RLS and triggers)');
  } else {
    console.log('\n💥 Migration failed. Check errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
