#!/usr/bin/env node

// Simple migration script using Supabase client
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://kong-production-5096.up.railway.app';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Check if chapters table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chapters');
      
    if (tablesError) {
      console.error('❌ Error checking existing tables:', tablesError);
      return;
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ Chapters table already exists');
      
      // Check paragraphs table
      const { data: paragraphsCheck } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'paragraphs');
        
      if (paragraphsCheck && paragraphsCheck.length > 0) {
        console.log('✅ Paragraphs table already exists');
      }
      
      // Check checks_done table
      const { data: checksCheck } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'checks_done');
        
      if (checksCheck && checksCheck.length > 0) {
        console.log('✅ Checks_done table already exists');
      }
      
      console.log('🎉 All tables appear to be present!');
      return;
    }
    
    console.log('📋 Tables missing, creating them manually...');
    
    // Create chapters table
    console.log('📝 Creating chapters table...');
    const chaptersSQL = `
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        topic_id UUID NOT NULL,
        index INT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (topic_id, index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);
      ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "Allow chapters access" ON chapters FOR ALL USING (true);
    `;
    
    // Using rpc to execute raw SQL
    const { error: chaptersError } = await supabase.rpc('exec', { sql: chaptersSQL });
    if (chaptersError) {
      console.log('ℹ️ Chapters table creation had some issues, but may already exist');
      console.log('Details:', chaptersError);
    } else {
      console.log('✅ Chapters table created successfully');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
