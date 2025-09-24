/**
 * Fix sessions table schema using direct PostgreSQL connection
 * Adds the missing updated_at field to resolve trigger errors
 */

import pkg from 'pg';
const { Client } = pkg;

// Direct PostgreSQL connection from the guide
const DATABASE_URL = 'postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres';

async function fixSessionsSchema() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: false // Disable SSL for Railway connection
    });

    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await client.connect();
        console.log('✅ Connected successfully');

        // Check if updated_at column already exists
        console.log('🔍 Checking if updated_at column exists...');
        const checkResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND column_name = 'updated_at'
            AND table_schema = 'public';
        `);

        if (checkResult.rows.length > 0) {
            console.log('✅ updated_at column already exists');
        } else {
            console.log('➕ Adding updated_at column to sessions table...');
            
            // Add the missing column
            await client.query(`
                ALTER TABLE sessions 
                ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            `);
            
            console.log('✅ updated_at column added successfully');
            
            // Update existing records to have the updated_at field set
            console.log('🔄 Updating existing records...');
            const updateResult = await client.query(`
                UPDATE sessions 
                SET updated_at = created_at 
                WHERE updated_at IS NULL;
            `);
            
            console.log(`✅ Updated ${updateResult.rowCount} existing records`);
        }

        // Verify the schema
        console.log('📊 Verifying sessions table schema...');
        const schemaResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);

        console.log('\n📋 Sessions table schema:');
        schemaResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
        });

        // Test a session update to see if the trigger works now
        console.log('\n🧪 Testing session update...');
        
        // Create a test session
        const insertResult = await client.query(`
            INSERT INTO sessions (settings, topic_count) 
            VALUES ('{"test": true}', 0) 
            RETURNING id;
        `);
        const testSessionId = insertResult.rows[0].id;
        console.log(`✅ Created test session: ${testSessionId}`);

        // Try to update it (this should trigger the updated_at trigger)
        await client.query(`
            UPDATE sessions 
            SET last_activity = NOW() 
            WHERE id = $1;
        `, [testSessionId]);
        
        console.log('✅ Session update successful - trigger is working!');

        // Clean up test session
        await client.query(`DELETE FROM sessions WHERE id = $1;`, [testSessionId]);
        console.log('🧹 Test session cleaned up');

        console.log('\n🎉 Sessions table schema fix completed successfully!');

    } catch (error) {
        console.error('❌ Error fixing sessions schema:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}

fixSessionsSchema();
