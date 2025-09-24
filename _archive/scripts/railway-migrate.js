/**
 * Railway Migration Script
 * Uses Railway CLI to execute SQL migration for paragraph features
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🚂 Railway Migration Script for Paragraph Features');
console.log('================================================');

// Check if Railway CLI is installed
function checkRailwayCLI() {
  try {
    execSync('railway --version', { stdio: 'pipe' });
    console.log('✅ Railway CLI is installed');
    return true;
  } catch (error) {
    console.log('❌ Railway CLI is not installed');
    console.log('📥 Please install it using one of these methods:');
    console.log('   npm: npm i -g @railway/cli');
    console.log('   brew: brew install railway');
    console.log('   scoop: scoop install railway');
    console.log('   or visit: https://docs.railway.com/guides/cli');
    return false;
  }
}

// Check if user is logged in
function checkAuth() {
  try {
    const result = execSync('railway whoami', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Authenticated with Railway');
    console.log(`👤 User: ${result.trim()}`);
    return true;
  } catch (error) {
    console.log('❌ Not authenticated with Railway');
    console.log('🔐 Please run: railway login');
    return false;
  }
}

// Execute SQL using Railway CLI
function executeMigration() {
  try {
    // Read the migration SQL file
    const migrationSQL = readFileSync(join(process.cwd(), 'scripts', 'add-paragraph-progress.sql'), 'utf8');
    
    console.log('\n📄 Migration SQL loaded successfully');
    console.log(`📊 SQL content length: ${migrationSQL.length} characters`);
    
    // Split into individual statements for better error handling
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))
      .filter(stmt => !stmt.toUpperCase().includes('BEGIN') && !stmt.toUpperCase().includes('COMMIT'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement using Railway CLI
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
      
      try {
        // Use Railway CLI to execute SQL
        // We'll use the postgres service connection
        const result = execSync(`railway run psql -c "${statement.replace(/"/g, '\\"')}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        successCount++;
        console.log(`✅ Statement ${i + 1} completed successfully`);
        
      } catch (error) {
        errorCount++;
        const errorMessage = error.stderr || error.message || 'Unknown error';
        
        if (errorMessage.includes('already exists')) {
          console.log(`ℹ️  Statement ${i + 1}: Already exists, skipping...`);
          successCount++; // Count as success since it's not a real error
          errorCount--;
        } else {
          console.error(`❌ Statement ${i + 1} failed: ${errorMessage.trim()}`);
        }
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🚀 Paragraph features are now ready to use!');
      return true;
    } else {
      console.log('\n⚠️  Some statements failed, but migration may still be functional');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure you\'re linked to the correct Railway project: railway link');
    console.log('   2. Ensure the PostgreSQL service is running');
    console.log('   3. Check that you have database access permissions');
    return false;
  }
}

// Test the new tables
function testTables() {
  console.log('\n🧪 Testing new tables...');
  
  try {
    // Test paragraph_progress table
    console.log('📋 Testing paragraph_progress table...');
    execSync('railway run psql -c "SELECT COUNT(*) FROM paragraph_progress LIMIT 1;"', { stdio: 'pipe' });
    console.log('✅ paragraph_progress table is accessible');
    
    // Test paragraph_qa table
    console.log('📋 Testing paragraph_qa table...');
    execSync('railway run psql -c "SELECT COUNT(*) FROM paragraph_qa LIMIT 1;"', { stdio: 'pipe' });
    console.log('✅ paragraph_qa table is accessible');
    
    console.log('\n🎉 All tables are working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Table test failed:', error.message);
    console.log('⚠️  Tables may not have been created successfully');
    return false;
  }
}

// Main execution
async function main() {
  console.log('\n🔍 Checking prerequisites...');
  
  if (!checkRailwayCLI()) {
    process.exit(1);
  }
  
  if (!checkAuth()) {
    process.exit(1);
  }
  
  console.log('\n🚀 Starting migration...');
  
  const migrationSuccess = executeMigration();
  
  if (migrationSuccess) {
    testTables();
  }
  
  console.log('\n🏁 Migration script completed');
  console.log('\n📖 Next steps:');
  console.log('   1. Start your development server: npm run dev');
  console.log('   2. Navigate to any topic page to see paragraph cards');
  console.log('   3. Click checkmarks to track reading progress');
  console.log('   4. Click chat icons to ask AI questions about paragraphs');
}

main().catch(console.error);

