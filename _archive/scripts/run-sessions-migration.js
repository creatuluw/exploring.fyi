/**
 * Quick script to run the sessions table migration
 * Fixes the missing updated_at field issue
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kong-production-5096.up.railway.app';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_ANON_KEY environment variable');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSessionsMigration() {
    try {
        console.log('🚀 Starting sessions table migration...');
        
        // Read the migration SQL
        const migrationSQL = readFileSync(join(__dirname, 'add-sessions-updated-at.sql'), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0 && !statement.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.includes('SELECT')) {
                // For SELECT statements, use .from() method
                console.log('📊 Verifying updated_at column...');
                const { data, error } = await supabase
                    .from('information_schema.columns')
                    .select('table_name, column_name, data_type, is_nullable, column_default')
                    .eq('table_name', 'sessions')
                    .eq('column_name', 'updated_at');
                
                if (error) {
                    console.error('❌ Verification failed:', error);
                } else {
                    console.log('✅ Column verification result:', data);
                }
            } else {
                // For DDL statements, use .rpc() or direct SQL execution
                console.log(`🔧 Executing: ${statement.substring(0, 50)}...`);
                
                // Use raw SQL execution via REST API
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ sql: statement })
                });
                
                if (!response.ok) {
                    console.error(`❌ Failed to execute statement: ${response.statusText}`);
                    console.error('Statement:', statement);
                } else {
                    console.log('✅ Statement executed successfully');
                }
            }
        }
        
        console.log('🎉 Sessions migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
runSessionsMigration();
