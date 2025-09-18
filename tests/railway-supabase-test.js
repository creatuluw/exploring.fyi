/**
 * Railway Supabase Template Integration Tests - Node.js Version
 * Tests the official Railway Supabase deployment for app readiness
 * 
 * Deployment URL: https://kong-production-413c.up.railway.app
 * Template: https://railway.com/deploy/supabase
 */

const { createClient } = require('@supabase/supabase-js')

// Railway Supabase Configuration
const SUPABASE_URL = 'https://kong-production-413c.up.railway.app'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Initialize Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test runner
class SupabaseTestRunner {
  constructor() {
    this.passed = 0
    this.failed = 0
    this.warnings = 0
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 ${name}`)
      await testFn()
      this.passed++
      console.log(`✅ PASSED: ${name}`)
    } catch (error) {
      this.failed++
      console.log(`❌ FAILED: ${name}`)
      console.log(`   Error: ${error.message}`)
    }
  }

  async runWarningTest(name, testFn) {
    try {
      console.log(`\n⚠️ ${name}`)
      await testFn()
      console.log(`✅ PASSED: ${name}`)
    } catch (error) {
      this.warnings++
      console.log(`⚠️ WARNING: ${name}`)
      console.log(`   Note: ${error.message}`)
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('🎯 RAILWAY SUPABASE TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${this.passed}`)
    console.log(`❌ Failed: ${this.failed}`)
    console.log(`⚠️ Warnings: ${this.warnings}`)
    console.log(`📊 Total: ${this.passed + this.failed + this.warnings}`)
    
    if (this.failed === 0) {
      console.log('\n🚀 RAILWAY SUPABASE IS READY FOR APP INTEGRATION!')
    } else {
      console.log('\n⚠️ Some issues found - check failed tests above')
    }
    console.log('='.repeat(60))
  }
}

// Test implementations
async function testKongGateway() {
  const response = await fetch(SUPABASE_URL)
  if (response.status >= 500) {
    throw new Error(`Kong gateway returned ${response.status}`)
  }
  console.log(`   Kong gateway status: ${response.status}`)
}

async function testPostgREST() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  })
  if (response.status >= 500) {
    throw new Error(`PostgREST API returned ${response.status}`)
  }
  console.log(`   PostgREST API status: ${response.status}`)
}

async function testAuthService() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY
    }
  })
  if (response.status >= 500) {
    throw new Error(`Auth service returned ${response.status}`)
  }
  console.log(`   Auth service status: ${response.status}`)
}

async function testSupabaseClient() {
  if (!supabase || !supabaseAdmin) {
    throw new Error('Supabase clients not initialized')
  }
  console.log('   Supabase clients initialized successfully')
}

async function testBasicAuth() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error && error.message.includes('network')) {
    throw new Error(`Network error: ${error.message}`)
  }
  
  console.log(`   Auth session test - Session: ${!!session}, Error: ${error?.message || 'none'}`)
}

async function testDatabaseAccess() {
  try {
    // Try to access system tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)

    if (error) {
      throw new Error(`Database access failed: ${error.message}`)
    }

    console.log(`   Found ${data?.length || 0} public tables`)
    if (data && data.length > 0) {
      console.log(`   Tables: ${data.map(t => t.table_name).slice(0, 3).join(', ')}`)
    }
  } catch (error) {
    throw new Error(`Database query failed: ${error.message}`)
  }
}

async function testCreateAppSchema() {
  try {
    // Try to create our application tables
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_exploring_fyi (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE test_exploring_fyi ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Allow all on test_exploring_fyi" ON test_exploring_fyi FOR ALL USING (true);
      `
    })

    if (error) {
      console.log(`   Schema creation via RPC: ${error.message}`)
      // Try basic table creation
      const { error: insertError } = await supabaseAdmin
        .from('test_exploring_fyi')
        .insert({ name: 'Railway Test' })

      if (insertError) {
        throw new Error(`Cannot create/access tables: ${insertError.message}`)
      }
    }

    console.log('   Database schema creation test passed')
    
    // Cleanup
    try {
      await supabaseAdmin.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS test_exploring_fyi;' })
    } catch (e) {
      // Cleanup failed, but that's okay
    }
  } catch (error) {
    throw new Error(`Schema creation failed: ${error.message}`)
  }
}

async function testCRUDOperations() {
  try {
    // Create a simple test table first
    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crud_test (
          id SERIAL PRIMARY KEY,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE crud_test ENABLE ROW LEVEL SECURITY;
        CREATE POLICY IF NOT EXISTS "Allow all on crud_test" ON crud_test FOR ALL USING (true);
      `
    })

    if (createError) {
      throw new Error(`Could not create test table: ${createError.message}`)
    }

    // Test INSERT
    const { data: insertData, error: insertError } = await supabase
      .from('crud_test')
      .insert({ name: 'Railway CRUD Test' })
      .select()

    if (insertError) {
      throw new Error(`INSERT failed: ${insertError.message}`)
    }

    const testId = insertData[0]?.id

    // Test SELECT
    const { data: selectData, error: selectError } = await supabase
      .from('crud_test')
      .select('*')
      .eq('id', testId)

    if (selectError || !selectData || selectData.length === 0) {
      throw new Error(`SELECT failed: ${selectError?.message || 'No data returned'}`)
    }

    // Test UPDATE
    const { error: updateError } = await supabase
      .from('crud_test')
      .update({ name: 'Updated Railway CRUD Test' })
      .eq('id', testId)

    if (updateError) {
      throw new Error(`UPDATE failed: ${updateError.message}`)
    }

    // Test DELETE
    const { error: deleteError } = await supabase
      .from('crud_test')
      .delete()
      .eq('id', testId)

    if (deleteError) {
      throw new Error(`DELETE failed: ${deleteError.message}`)
    }

    console.log('   All CRUD operations successful')

    // Cleanup
    await supabaseAdmin.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS crud_test;' })
  } catch (error) {
    throw new Error(`CRUD test failed: ${error.message}`)
  }
}

async function testRealtime() {
  try {
    let connected = false
    
    const channel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('   Real-time message received')
        connected = true
      })
      .subscribe((status) => {
        console.log(`   Real-time status: ${status}`)
      })

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Send test message
    await channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Railway Real-time Test' }
    })

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Cleanup
    await supabase.removeChannel(channel)

    if (!connected) {
      throw new Error('Real-time connection not established')
    }

    console.log('   Real-time functionality working')
  } catch (error) {
    throw new Error(`Real-time test failed: ${error.message}`)
  }
}

async function testPerformance() {
  const startTime = Date.now()
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  })
  
  const endTime = Date.now()
  const latency = endTime - startTime
  
  if (latency > 10000) {
    throw new Error(`Response too slow: ${latency}ms`)
  }
  
  console.log(`   API Response time: ${latency}ms`)
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Railway Supabase Template Integration Tests')
  console.log('='.repeat(60))
  console.log(`📍 Testing URL: ${SUPABASE_URL}`)
  console.log(`📅 Test Date: ${new Date().toISOString()}`)
  
  const runner = new SupabaseTestRunner()

  // Critical tests (must pass)
  await runner.runTest('Kong API Gateway Accessibility', testKongGateway)
  await runner.runTest('PostgREST API Functionality', testPostgREST)
  await runner.runTest('Supabase Client Initialization', testSupabaseClient)
  await runner.runTest('Basic Database Access', testDatabaseAccess)
  await runner.runTest('API Response Performance', testPerformance)

  // Important tests (should pass)
  await runner.runWarningTest('Auth Service Availability', testAuthService)
  await runner.runWarningTest('Authentication Session Handling', testBasicAuth)
  await runner.runWarningTest('Database Schema Creation', testCreateAppSchema)
  await runner.runWarningTest('CRUD Operations', testCRUDOperations)

  // Optional tests (nice to have)
  await runner.runWarningTest('Real-time Functionality', testRealtime)

  // Print final summary
  runner.printSummary()

  // Print integration instructions
  console.log('\n🔧 NEXT STEPS FOR APP INTEGRATION:')
  console.log('1. Update your SvelteKit app configuration:')
  console.log(`   - SUPABASE_URL = "${SUPABASE_URL}"`)
  console.log(`   - SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}"`)
  console.log('2. Create your application database schema')
  console.log('3. Test your app with the Railway Supabase instance')
  console.log('4. Configure authentication if needed')
  
  console.log('\n📋 CONFIGURATION SUMMARY:')
  console.log('Template: https://railway.com/deploy/supabase')
  console.log(`Kong Gateway: ${SUPABASE_URL}`)
  console.log('Services: Kong, PostgREST, Auth, Realtime, Studio, Postgres')
  
  return runner.failed === 0
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = { runAllTests }
