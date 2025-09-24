/**
 * Supabase Migration Script using REST API
 * Creates paragraph_progress and paragraph_qa tables using Supabase REST API
 * Based on: https://supabase.com/docs/guides/api
 */

// Railway Supabase configuration
const SUPABASE_URL = 'https://kong-production-5096.up.railway.app';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ';

console.log('🚀 Supabase Table Migration Script');
console.log('==================================');
console.log(`📡 API URL: ${SUPABASE_URL}`);

/**
 * Execute SQL using Supabase REST API
 * We'll use the rpc endpoint to execute raw SQL
 */
async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);
  
  try {
    // Try different approaches based on Supabase API capabilities
    
    // Method 1: Try using a stored procedure if available
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log(`✅ ${description} - Success`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${description} - Method 1 failed: ${response.status}`);
      
      // Method 2: Try direct SQL execution via PostgREST
      return await executeDirectSQL(sql, description);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    return false;
  }
}

/**
 * Alternative method: Try to create tables using direct PostgREST schema modification
 */
async function executeDirectSQL(sql, description) {
  try {
    // Method 2: Use the schema endpoint to modify database structure
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.pgrst.object+json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: sql
    });

    if (response.ok) {
      console.log(`✅ ${description} - Success (Method 2)`);
      return true;
    } else {
      console.log(`❌ ${description} - Method 2 also failed`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - Method 2 error: ${error.message}`);
    return false;
  }
}

/**
 * Test if tables exist using Supabase REST API
 */
async function testTableExists(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      console.log(`✅ ${tableName}: Table exists and is accessible`);
      return true;
    } else if (response.status === 406 || response.status === 400) {
      // Table exists but may have different schema
      console.log(`✅ ${tableName}: Table exists`);
      return true;
    } else {
      console.log(`❌ ${tableName}: ${response.status} - Table doesn't exist`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${tableName}: Error testing - ${error.message}`);
    return false;
  }
}

/**
 * Create tables using schema-based approach
 */
async function createTablesViaSchema() {
  console.log('\n🔧 Attempting schema-based table creation...');
  
  // Since direct SQL execution might not be available,
  // let's try using the application itself to create the tables
  try {
    const response = await fetch('http://localhost:5173/api/create-tables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tables: ['paragraph_progress', 'paragraph_qa']
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Tables created via application API');
      return true;
    } else {
      console.log('❌ Application API not available');
      return false;
    }
  } catch (error) {
    console.log('ℹ️  Application API approach not available');
    return false;
  }
}

/**
 * Manual table creation instructions
 */
function showManualInstructions() {
  console.log('\n📋 Manual Creation Required');
  console.log('============================');
  console.log('\nSince automated creation failed, please create the tables manually:');
  console.log('\n1. Access your Railway project dashboard');
  console.log('2. Navigate to the PostgreSQL service');
  console.log('3. Open the database console or connect via psql');
  console.log('4. Execute the following SQL:\n');
  
  console.log('-- Create paragraph_progress table');
  console.log('CREATE TABLE IF NOT EXISTS paragraph_progress (');
  console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
  console.log('    session_id UUID NOT NULL,');
  console.log('    topic_id UUID NOT NULL,');
  console.log('    section_id TEXT NOT NULL,');
  console.log('    paragraph_id TEXT NOT NULL,');
  console.log('    paragraph_hash TEXT NOT NULL,');
  console.log('    is_read BOOLEAN DEFAULT FALSE,');
  console.log('    read_at TIMESTAMPTZ DEFAULT NULL,');
  console.log('    created_at TIMESTAMPTZ DEFAULT NOW(),');
  console.log('    updated_at TIMESTAMPTZ DEFAULT NOW(),');
  console.log('    UNIQUE(session_id, topic_id, section_id, paragraph_id)');
  console.log(');\n');
  
  console.log('-- Create paragraph_qa table');
  console.log('CREATE TABLE IF NOT EXISTS paragraph_qa (');
  console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
  console.log('    session_id UUID NOT NULL,');
  console.log('    topic_id UUID NOT NULL,');
  console.log('    section_id TEXT NOT NULL,');
  console.log('    paragraph_id TEXT NOT NULL,');
  console.log('    paragraph_hash TEXT NOT NULL,');
  console.log('    question TEXT NOT NULL,');
  console.log('    answer TEXT NOT NULL,');
  console.log('    ai_model TEXT DEFAULT \'gemini-2.5-flash\',');
  console.log('    created_at TIMESTAMPTZ DEFAULT NOW(),');
  console.log('    updated_at TIMESTAMPTZ DEFAULT NOW()');
  console.log(');\n');
  
  console.log('-- Create indexes');
  console.log('CREATE INDEX IF NOT EXISTS idx_paragraph_progress_session_topic ON paragraph_progress(session_id, topic_id);');
  console.log('CREATE INDEX IF NOT EXISTS idx_paragraph_qa_session_topic ON paragraph_qa(session_id, topic_id);');
  
  console.log('\n💾 This SQL is also saved in: scripts/create-paragraph-tables-manual.sql');
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('\n🔍 Checking existing tables...');
  
  // Check which tables already exist
  const existingTables = [];
  const missingTables = [];
  
  const tablesToCheck = ['paragraph_progress', 'paragraph_qa'];
  
  for (const table of tablesToCheck) {
    const exists = await testTableExists(table);
    if (exists) {
      existingTables.push(table);
    } else {
      missingTables.push(table);
    }
  }
  
  if (missingTables.length === 0) {
    console.log('\n🎉 All paragraph tables already exist!');
    console.log('✅ paragraph_progress');
    console.log('✅ paragraph_qa');
    console.log('\n🚀 Paragraph features are ready to use!');
    return;
  }
  
  console.log(`\n📊 Status: ${existingTables.length} exist, ${missingTables.length} missing`);
  console.log('Missing tables:', missingTables.join(', '));
  
  // Try different creation methods
  console.log('\n🔧 Attempting to create missing tables...');
  
  const methods = [
    { name: 'Schema-based API', func: createTablesViaSchema },
  ];
  
  let success = false;
  
  for (const method of methods) {
    console.log(`\n🔄 Trying ${method.name}...`);
    success = await method.func();
    if (success) break;
  }
  
  if (!success) {
    showManualInstructions();
    console.log('\n⚠️  Automated creation failed - manual setup required');
  } else {
    console.log('\n🎉 Tables created successfully!');
    console.log('🚀 Paragraph features are now ready to use!');
  }
  
  // Final verification
  console.log('\n🧪 Final verification...');
  for (const table of tablesToCheck) {
    await testTableExists(table);
  }
}

// Run the migration
runMigration().catch(console.error);

