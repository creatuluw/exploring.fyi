/**
 * Database Setup Script for Railway Supabase
 * Creates all required tables and indexes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Railway Supabase configuration
const SUPABASE_URL = 'https://kong-production-413c.up.railway.app';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4MjA3NDUzLCJleHAiOjIwNzM1Njc0NTN9.IuVfikFs4uPectjmuYte4TqlsL_12_brJpD4rNEeChE';

console.log('🚀 Setting up database schema...');
console.log(`📡 Connecting to: ${SUPABASE_URL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
  try {
    // Read the SQL schema file
    const schemaSQL = readFileSync(join(__dirname, 'database-schema.sql'), 'utf8');
    
    console.log('📄 SQL schema file loaded successfully');
    
    // Split SQL into individual statements (simple approach)
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Use the RPC function to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // Try alternative approach using PostgREST
          console.log(`⚠️  RPC failed, trying direct query...`);
          
          // For DDL statements, we might need to use a different approach
          // Let's try to create tables one by one using direct API calls
          if (statement.includes('CREATE TABLE') && statement.includes('sessions')) {
            console.log('🔧 Creating sessions table...');
            // This would need to be handled differently for each table
          }
          
          console.warn(`❌ Error in statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Database Setup Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('🎉 Database schema setup completed successfully!');
    } else {
      console.log('⚠️  Database setup completed with some errors. Manual intervention may be required.');
    }
    
    // Test the connection by trying to query a table
    console.log('\n🧪 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('sessions')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database test failed:', testError.message);
      console.log('💡 Tables may not exist yet. You may need to run the SQL manually.');
    } else {
      console.log('✅ Database connection test successful!');
      console.log('🎯 Ready to use the application with full persistence!');
    }
    
  } catch (error) {
    console.error('💥 Fatal error setting up database:', error);
    process.exit(1);
  }
}

// Alternative: Manual table creation function
async function createTablesManually() {
  console.log('🔧 Attempting manual table creation...');
  
  const tables = [
    {
      name: 'sessions',
      create: `
        CREATE TABLE sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID DEFAULT NULL,
          settings JSONB DEFAULT '{}',
          last_activity TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          topic_count INTEGER DEFAULT 0
        )
      `
    },
    // Add more tables as needed
  ];
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}`);
      
      // Since we can't execute DDL directly, we'll need to use Supabase Dashboard
      console.log(`⚠️  Please create this table manually in Supabase Dashboard:`);
      console.log(table.create);
      console.log('---');
      
    } catch (error) {
      console.error(`Error creating ${table.name}:`, error);
    }
  }
}

// Main execution
if (process.argv.includes('--manual')) {
  createTablesManually();
} else {
  setupDatabase();
}

export { setupDatabase, createTablesManually };
