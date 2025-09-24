#!/usr/bin/env node

// Simple migration using the exact Railway PostgreSQL connection
import pg from 'pg';
import { readFileSync } from 'fs';

// Use the exact connection string from Railway
const DATABASE_URL = 'postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres';

console.log('🚀 Connecting to Railway PostgreSQL...');

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: false
});

async function createTables() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check existing tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chapters', 'paragraphs', 'checks_done')
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    console.log('📋 Existing tables:', existingTables);

    if (existingTables.length === 3) {
      console.log('✅ All tables already exist!');
      
      // List all tables to confirm
      const allTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('\n📊 All tables in database:');
      allTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      
      return;
    }

    console.log('🔨 Creating missing tables...');

    // Create chapters table
    if (!existingTables.includes('chapters')) {
      console.log('📝 Creating chapters table...');
      await client.query(`
        CREATE TABLE chapters (
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
        
        CREATE INDEX idx_chapters_topic_id ON chapters(topic_id);
        ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow chapters access" ON chapters FOR ALL USING (true);
      `);
      console.log('✅ Chapters table created');
    }

    // Create paragraphs table
    if (!existingTables.includes('paragraphs')) {
      console.log('📝 Creating paragraphs table...');
      await client.query(`
        CREATE TABLE paragraphs (
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
        
        CREATE INDEX idx_paragraphs_chapter_id ON paragraphs(chapter_id);
        CREATE INDEX idx_paragraphs_topic_id ON paragraphs(topic_id);
        ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow paragraphs access" ON paragraphs FOR ALL USING (true);
      `);
      console.log('✅ Paragraphs table created');
    }

    // Create checks_done table
    if (!existingTables.includes('checks_done')) {
      console.log('📝 Creating checks_done table...');
      await client.query(`
        CREATE TABLE checks_done (
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
        
        CREATE INDEX idx_checks_done_session_id ON checks_done(session_id);
        CREATE INDEX idx_checks_done_topic_id ON checks_done(topic_id);
        CREATE INDEX idx_checks_done_chapter_id ON checks_done(chapter_id);
        ALTER TABLE checks_done ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow checks_done access" ON checks_done FOR ALL USING (true);
      `);
      console.log('✅ Checks_done table created');
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

createTables();
