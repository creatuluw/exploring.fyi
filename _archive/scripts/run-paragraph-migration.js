/**
 * Script to run the paragraph progress migration
 * Adds paragraph_progress and paragraph_qa tables to the database
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Direct PostgreSQL connection (from the test file)
const dbConfig = {
  connectionString: 'postgresql://supabase_admin:kam8nkm2lwhsz6rsudtv6q5a5zw3tmzyuxz9w7wszm4etd8gn0zcm4a22vfyhsdk@mainline.proxy.rlwy.net:36402/postgres',
  ssl: false,
  connectTimeoutMillis: 5000
};

console.log('🗃️ Running paragraph progress migration...');
console.log('📡 Connecting to PostgreSQL database...');

const client = new Client(dbConfig);

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Read the migration SQL file
    const migrationSQL = readFileSync(join(process.cwd(), 'scripts', 'add-paragraph-progress.sql'), 'utf8');
    
    console.log('📄 SQL migration file loaded successfully');
    
    // Execute the entire migration as one transaction
    console.log('📝 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Test the new tables
    console.log('\n🧪 Testing new tables...');
    
    // Test paragraph_progress table
    try {
      const progressResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'paragraph_progress'
      `);
      
      if (progressResult.rows.length > 0) {
        console.log('✅ paragraph_progress table created');
      } else {
        console.log('❌ paragraph_progress table not found');
      }
    } catch (error) {
      console.log('❌ paragraph_progress table check failed:', error.message);
    }

    // Test paragraph_qa table
    try {
      const qaResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'paragraph_qa'
      `);
      
      if (qaResult.rows.length > 0) {
        console.log('✅ paragraph_qa table created');
      } else {
        console.log('❌ paragraph_qa table not found');
      }
    } catch (error) {
      console.log('❌ paragraph_qa table check failed:', error.message);
    }

    console.log('\n🎉 Migration process completed!');
    console.log('🚀 The paragraph-based learning features are now ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Check the error above for details.');
    console.log('📄 SQL file location: scripts/add-paragraph-progress.sql');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
