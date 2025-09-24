/**
 * Quick fix for sessions table missing updated_at field
 */

import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const SUPABASE_URL = 'https://kong-production-5096.up.railway.app';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSessionsSchema() {
    try {
        console.log('🔧 Fixing sessions table schema...');
        
        // Try to add the missing updated_at column
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();'
        });
        
        if (error) {
            console.error('❌ Error executing SQL:', error);
            
            // If direct SQL doesn't work, let's try a workaround
            console.log('🔄 Trying alternative approach...');
            
            // Check if the column already exists
            const { data: columns, error: checkError } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', 'sessions')
                .eq('column_name', 'updated_at');
                
            if (checkError) {
                console.error('❌ Cannot check column existence:', checkError);
            } else if (columns && columns.length > 0) {
                console.log('✅ updated_at column already exists');
            } else {
                console.log('⚠️ updated_at column missing, but cannot add via API');
                console.log('📋 Manual fix required:');
                console.log('   Run this SQL in Supabase dashboard or Railway console:');
                console.log('   ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();');
            }
        } else {
            console.log('✅ Sessions table schema fixed successfully!');
        }
        
        // Test a session update to see if the error is resolved
        console.log('🧪 Testing session update...');
        
        // First create a test session
        const { data: session, error: createError } = await supabase
            .from('sessions')
            .insert({
                settings: { test: true },
                topic_count: 0
            })
            .select()
            .single();
            
        if (createError) {
            console.error('❌ Failed to create test session:', createError);
        } else {
            console.log('✅ Test session created:', session.id);
            
            // Now try to update it
            const { error: updateError } = await supabase
                .from('sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', session.id);
                
            if (updateError) {
                console.error('❌ Session update still failing:', updateError);
                console.log('🔧 The trigger is still causing issues. Check database schema.');
            } else {
                console.log('✅ Session update works now!');
            }
            
            // Clean up test session
            await supabase.from('sessions').delete().eq('id', session.id);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixSessionsSchema();
