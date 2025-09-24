#!/usr/bin/env node

// Manual table creation using raw HTTP requests to Supabase REST API
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://kong-production-5096.up.railway.app';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

async function createTables() {
  console.log('🚀 Creating tables manually...');
  
  // SQL commands to create tables
  const createChaptersSQL = `
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
  `;
  
  const createParagraphsSQL = `
    CREATE TABLE IF NOT EXISTS paragraphs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      topic_id UUID NOT NULL,
      chapter_id UUID NOT NULL,
      index INT NOT NULL,
      content TEXT,
      summary TEXT,
      metadata JSONB,
      is_generated BOOLEAN NOT NULL DEFAULT FALSE,
      generated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (chapter_id, index)
    );
  `;
  
  const createChecksSQL = `
    CREATE TABLE IF NOT EXISTS checks_done (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID NOT NULL,
      topic_id UUID NOT NULL,
      chapter_id UUID NOT NULL,
      questions JSONB NOT NULL,
      answers JSONB NOT NULL,
      ai_feedback JSONB,
      score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
      model TEXT,
      duration_seconds INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  
  console.log('\n📋 MANUAL STEPS TO CREATE TABLES:');
  console.log('\n1. Open pgAdmin and connect to your database');
  console.log('2. Right-click on your database → Tools → Query Tool');
  console.log('3. Copy and paste each SQL command below, then execute (F5):\n');
  
  console.log('-- Step 1: Create chapters table');
  console.log(createChaptersSQL);
  console.log('\n-- Step 2: Create paragraphs table');
  console.log(createParagraphsSQL);
  console.log('\n-- Step 3: Create checks_done table');
  console.log(createChecksSQL);
  
  console.log('\n-- Step 4: Create indexes and RLS');
  console.log(`
    CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);
    CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON paragraphs(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_paragraphs_topic_id ON paragraphs(topic_id);
    CREATE INDEX IF NOT EXISTS idx_checks_done_session_id ON checks_done(session_id);
    CREATE INDEX IF NOT EXISTS idx_checks_done_topic_id ON checks_done(topic_id);
    CREATE INDEX IF NOT EXISTS idx_checks_done_chapter_id ON checks_done(chapter_id);
    
    ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
    ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Allow chapters access" ON chapters FOR ALL USING (true);
    CREATE POLICY IF NOT EXISTS "Allow paragraphs access" ON paragraphs FOR ALL USING (true);
    CREATE POLICY IF NOT EXISTS "Allow checks_done access" ON checks_done FOR ALL USING (true);
  `);
  
  console.log('\n✅ After running these commands, refresh your Tables list in pgAdmin');
  console.log('✅ You should see: chapters, paragraphs, checks_done appear');
}

createTables();
