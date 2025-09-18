/**
 * Create Database Tables using Supabase REST API
 * Uses the Railway Supabase API endpoint directly
 */

import { createClient } from '@supabase/supabase-js';

// Railway Supabase configuration from the NEW deployment
const SUPABASE_URL = 'https://kong-production-5096.up.railway.app';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ';

console.log('🚀 Creating database tables using Supabase API...');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTablesViaAPI() {
  try {
    console.log('📡 Connecting to Railway Supabase API...');
    
    // First, let's try to execute SQL directly using the API
    // Note: This might require admin privileges, but let's try
    
    // Method 1: Try using RPC to execute SQL
    console.log('🔧 Attempting to create tables via RPC...');
    
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID DEFAULT NULL,
        settings JSONB DEFAULT '{}',
        last_activity TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        topic_count INTEGER DEFAULT 0
      );
    `;
    
    const createTopicsTable = `
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        title TEXT NOT NULL,
        source_url TEXT DEFAULT NULL,
        source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
        mind_map_data JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const createMindMapsTable = `
      CREATE TABLE IF NOT EXISTS mind_maps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL,
        nodes JSONB NOT NULL DEFAULT '[]',
        edges JSONB NOT NULL DEFAULT '[]',
        layout_data JSONB DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const createSourcesTable = `
      CREATE TABLE IF NOT EXISTS sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        credibility_score NUMERIC(3,1) NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 10),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const createProgressTable = `
      CREATE TABLE IF NOT EXISTS content_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        topic_id UUID NOT NULL,
        section_id TEXT NOT NULL,
        progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        time_spent_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        last_viewed TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, topic_id, section_id)
      );
    `;
    
    const createAIGenerationsTable = `
      CREATE TABLE IF NOT EXISTS ai_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID NOT NULL,
        content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('analysis', 'expansion', 'content_page')),
        input_data JSONB NOT NULL,
        generated_content JSONB DEFAULT NULL,
        processing_time_ms INTEGER DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    const tables = [
      { name: 'sessions', sql: createSessionsTable },
      { name: 'topics', sql: createTopicsTable },
      { name: 'mind_maps', sql: createMindMapsTable },
      { name: 'sources', sql: createSourcesTable },
      { name: 'content_progress', sql: createProgressTable },
      { name: 'ai_generations', sql: createAIGenerationsTable }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    // Try to create each table
    for (const table of tables) {
      try {
        console.log(`📊 Creating table: ${table.name}`);
        
        // Method: Use direct HTTP API call to PostgREST
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            sql: table.sql
          })
        });
        
        if (response.ok) {
          console.log(`✅ Created table: ${table.name}`);
          successCount++;
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed to create ${table.name}: ${response.status} - ${errorText}`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ Error creating ${table.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Results Summary:');
    console.log(`✅ Success: ${successCount} tables`);
    console.log(`❌ Errors: ${errorCount} tables`);
    
    if (errorCount > 0) {
      console.log('\n🔧 Alternative approach: Manual table creation');
      console.log('Since the API approach had issues, let\'s try a different method...');
      
      // Alternative: Try to create tables one by one using Supabase client methods
      await createTablesAlternative();
    }
    
    // Test if any tables were created
    await testTableAccess();
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    console.log('\n💡 Alternative solutions:');
    console.log('1. Use Railway dashboard to access PostgreSQL directly');
    console.log('2. Install psql and connect manually');
    console.log('3. Use a database GUI tool like pgAdmin');
  }
}

async function createTablesAlternative() {
  console.log('\n🔄 Trying alternative approach...');
  
  try {
    // Try to create a simple test table first
    const { data, error } = await supabase
      .schema('public')
      .from('sessions') // This will fail if table doesn't exist
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('📋 Tables don\'t exist - need manual creation');
      console.log('\n🔧 Manual Steps Required:');
      console.log('1. Access Railway PostgreSQL via admin connection');
      console.log('2. Run the SQL from database-schema.sql');
      console.log('3. Or use Railway dashboard database interface');
    }
    
  } catch (error) {
    console.log('📋 Could not access tables via API');
  }
}

async function testTableAccess() {
  console.log('\n🧪 Testing table access...');
  
  const tablesToTest = ['sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations'];
  
  for (const tableName of tablesToTest) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: Accessible`);
      }
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
    }
  }
}

// Run the creation process
createTablesViaAPI();
