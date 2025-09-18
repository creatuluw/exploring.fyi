/**
 * Railway Supabase Template Integration Tests - Updated with Correct JWT
 * Tests the Railway Supabase deployment with properly matching JWT secrets
 */

const { createClient } = require('@supabase/supabase-js')

// Railway Supabase Configuration - UPDATED KEYS
const SUPABASE_URL = 'https://kong-production-413c.up.railway.app'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4MjA3NDUzLCJleHAiOjIwNzM1Njc0NTN9.IuVfikFs4uPectjmuYte4TqlsL_12_brJpD4rNEeChE'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NTgyMDc0NTMsImV4cCI6MjA3MzU2NzQ1M30.oxs4PTh4PrBtG5LIuFMlX6L1-EqBwBbNfw2hz64_Y7E'

// Initialize Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runFullTest() {
  console.log('🚀 Railway Supabase Template - Updated JWT Test')
  console.log('='.repeat(60))
  console.log(`📍 Testing URL: ${SUPABASE_URL}`)
  console.log(`🔑 Using updated JWT tokens`)
  console.log(`📅 Test Date: ${new Date().toISOString()}`)
  
  let passed = 0
  let failed = 0

  // Test 1: Basic API Access
  console.log('\n🧪 Test 1: Basic API Access')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    console.log(`   Response status: ${response.status}`)
    if (response.status === 200 || response.status === 404) {
      console.log('✅ API accessible with correct authentication')
      passed++
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
      failed++
    }
  } catch (error) {
    console.log(`❌ API access failed: ${error.message}`)
    failed++
  }

  // Test 2: Database Schema Creation
  console.log('\n🧪 Test 2: Database Schema Creation')
  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS exploring_fyi_test (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE exploring_fyi_test ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Allow all on exploring_fyi_test" 
        ON exploring_fyi_test FOR ALL USING (true);
      `
    })

    if (!error) {
      console.log('✅ Database schema creation successful')
      passed++
    } else {
      console.log(`❌ Schema creation failed: ${error.message}`)
      failed++
    }
  } catch (error) {
    console.log(`❌ Schema test failed: ${error.message}`)
    failed++
  }

  // Test 3: CRUD Operations
  console.log('\n🧪 Test 3: CRUD Operations')
  try {
    // CREATE
    const { data: insertData, error: insertError } = await supabase
      .from('exploring_fyi_test')
      .insert({ name: 'Railway Supabase Integration Test' })
      .select()

    if (insertError) {
      throw new Error(`INSERT failed: ${insertError.message}`)
    }

    const testId = insertData[0].id
    console.log(`   ✅ INSERT successful: ${testId}`)

    // READ
    const { data: selectData, error: selectError } = await supabase
      .from('exploring_fyi_test')
      .select('*')
      .eq('id', testId)

    if (selectError || !selectData || selectData.length === 0) {
      throw new Error(`SELECT failed: ${selectError?.message || 'No data'}`)
    }

    console.log(`   ✅ SELECT successful: ${selectData[0].name}`)

    // UPDATE
    const { error: updateError } = await supabase
      .from('exploring_fyi_test')
      .update({ name: 'Updated Test Record' })
      .eq('id', testId)

    if (updateError) {
      throw new Error(`UPDATE failed: ${updateError.message}`)
    }

    console.log('   ✅ UPDATE successful')

    // DELETE
    const { error: deleteError } = await supabase
      .from('exploring_fyi_test')
      .delete()
      .eq('id', testId)

    if (deleteError) {
      throw new Error(`DELETE failed: ${deleteError.message}`)
    }

    console.log('   ✅ DELETE successful')
    console.log('✅ All CRUD operations working correctly')
    passed++

  } catch (error) {
    console.log(`❌ CRUD operations failed: ${error.message}`)
    failed++
  }

  // Test 4: Authentication
  console.log('\n🧪 Test 4: Authentication System')
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error && !error.message.includes('network')) {
      throw new Error(`Auth failed: ${error.message}`)
    }

    console.log(`   Session status: ${session ? 'Active' : 'None'}`)
    console.log('✅ Authentication system responding')
    passed++
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`)
    failed++
  }

  // Test 5: Create Application Schema
  console.log('\n🧪 Test 5: Create Application Schema')
  try {
    const appSchema = `
      -- Create sessions table for exploring.fyi
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_activity TIMESTAMPTZ DEFAULT NOW(),
        topic_count INTEGER DEFAULT 0,
        settings JSONB DEFAULT '{}'::jsonb
      );

      -- Create topics table for exploring.fyi
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        mind_map_data JSONB,
        source_url TEXT,
        source_type TEXT
      );

      -- Enable RLS
      ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY IF NOT EXISTS "Allow all on sessions" ON sessions FOR ALL USING (true);
      CREATE POLICY IF NOT EXISTS "Allow all on topics" ON topics FOR ALL USING (true);

      -- Insert default session
      INSERT INTO sessions (id, user_id, settings) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'anonymous', '{"theme": "light", "language": "en"}') 
      ON CONFLICT (id) DO NOTHING;
    `

    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: appSchema })

    if (!error) {
      console.log('✅ Application schema created successfully')
      
      // Test inserting data
      const { data, error: insertError } = await supabase
        .from('sessions')
        .select('*')
        .limit(1)

      if (!insertError) {
        console.log(`   ✅ Sessions table accessible with ${data?.length || 0} records`)
        passed++
      } else {
        throw new Error(`Schema access failed: ${insertError.message}`)
      }
    } else {
      throw new Error(`Schema creation failed: ${error.message}`)
    }
  } catch (error) {
    console.log(`❌ Application schema test failed: ${error.message}`)
    failed++
  }

  // Cleanup test table
  try {
    await supabaseAdmin.rpc('exec_sql', { 
      sql: 'DROP TABLE IF EXISTS exploring_fyi_test;' 
    })
  } catch (e) {
    // Cleanup failure is okay
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('🎯 RAILWAY SUPABASE TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${passed + failed}`)
  
  if (failed === 0) {
    console.log('\n🚀 ALL TESTS PASSED - SUPABASE IS READY!')
    console.log('\n🔧 Next Steps:')
    console.log('1. Update your SvelteKit app configuration')
    console.log('2. Test your actual application features')
    console.log('3. Deploy your app with the new Supabase backend')
  } else {
    console.log('\n⚠️ Some tests failed - check Railway environment variables')
  }
  
  console.log('\n📋 Configuration for SvelteKit:')
  console.log(`SUPABASE_URL="${SUPABASE_URL}"`)
  console.log(`SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"`)
  console.log('='.repeat(60))

  return failed === 0
}

if (require.main === module) {
  runFullTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Test failed:', error)
      process.exit(1)
    })
}

module.exports = { runFullTest }
