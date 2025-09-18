/**
 * Create Database Tables using Direct PostgreSQL Connection
 * Uses the PostgreSQL connection details from Railway
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

console.log('🐘 Creating database tables using direct PostgreSQL connection...');

// Use the connection details from Railway variables we got
const dbConfig = {
  connectionString: 'postgresql://supabase_admin:kam8nkm2lwhsz6rsudtv6q5a5zw3tmzyuxz9w7wszm4etd8gn0zcm4a22vfyhsdk@mainline.proxy.rlwy.net:36402/postgres',
  ssl: false  // Railway doesn't require SSL for this connection
};

async function createTablesDirectly() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read and execute the schema
    console.log('📄 Reading database schema...');
    const schema = readFileSync('./database-schema.sql', 'utf8');
    
    // Split SQL into individual statements and clean them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') &&
        !stmt.includes('SELECT \'Database schema created successfully')
      );
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
        
      } catch (error) {
        // Some errors are okay (like "already exists")
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Statement ${i + 1}: ${error.message}`);
          successCount++;
        } else {
          console.error(`❌ Error in statement ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    console.log('\n📊 Database Setup Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Test the tables
    console.log('\n🧪 Testing created tables...');
    
    const tableTest = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN ('sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations');
    `);
    
    console.log('📋 Created tables:');
    const createdTables = tableTest.rows.map(row => row.table_name);
    
    const expectedTables = ['sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations'];
    
    expectedTables.forEach(tableName => {
      if (createdTables.includes(tableName)) {
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} - NOT FOUND`);
      }
    });
    
    if (createdTables.length === expectedTables.length) {
      console.log('\n🎉 All tables created successfully!');
      console.log('🚀 Your database is ready for the full user history system!');
      
      // Test inserting a sample session
      console.log('\n🧪 Testing database operations...');
      
      try {
        const testResult = await client.query(`
          INSERT INTO sessions (settings, topic_count) 
          VALUES ('{"test": true}', 0) 
          RETURNING id;
        `);
        
        const sessionId = testResult.rows[0].id;
        console.log(`✅ Test session created: ${sessionId}`);
        
        // Clean up test data
        await client.query('DELETE FROM sessions WHERE settings @> \'{"test": true}\'');
        console.log('🧹 Test data cleaned up');
        
      } catch (error) {
        console.log(`⚠️  Database test failed: ${error.message}`);
      }
      
    } else {
      console.log('\n⚠️  Some tables were not created. Check the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Connection failed. Make sure:');
      console.log('1. Railway PostgreSQL service is running');
      console.log('2. Connection details are correct');
      console.log('3. Network access is allowed');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the setup
createTablesDirectly();
