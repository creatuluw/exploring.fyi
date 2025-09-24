/**
 * Test if the sessions table fix resolved the 400 error
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kong-production-5096.up.railway.app';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Accept': 'application/json',
      'Accept-Profile': 'public'
    }
  }
});

async function testSessionOperations() {
    try {
        console.log('🧪 Testing session operations...');

        // Test 1: Create a new session
        console.log('\n1️⃣ Creating new session...');
        const { data: session, error: createError } = await supabase
            .from('sessions')
            .insert({
                settings: { test: true },
                topic_count: 0
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create session:', createError);
            return;
        }

        console.log('✅ Session created successfully:', session.id);

        // Test 2: Update session activity (this was failing before)
        console.log('\n2️⃣ Updating session activity...');
        const { error: updateError } = await supabase
            .from('sessions')
            .update({ 
                last_activity: new Date().toISOString()
            })
            .eq('id', session.id);

        if (updateError) {
            console.error('❌ Failed to update session:', updateError);
        } else {
            console.log('✅ Session update successful - no more 400 errors!');
        }

        // Test 3: Update with both last_activity and updated_at
        console.log('\n3️⃣ Updating with both fields...');
        const now = new Date().toISOString();
        const { error: fullUpdateError } = await supabase
            .from('sessions')
            .update({ 
                last_activity: now,
                updated_at: now,
                topic_count: 1
            })
            .eq('id', session.id);

        if (fullUpdateError) {
            console.error('❌ Failed full update:', fullUpdateError);
        } else {
            console.log('✅ Full update successful!');
        }

        // Test 4: Get the updated session to verify
        console.log('\n4️⃣ Retrieving updated session...');
        const { data: updatedSession, error: getError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', session.id)
            .single();

        if (getError) {
            console.error('❌ Failed to get session:', getError);
        } else {
            console.log('✅ Session retrieved successfully:');
            console.log('   - ID:', updatedSession.id);
            console.log('   - Created:', updatedSession.created_at);
            console.log('   - Updated:', updatedSession.updated_at);
            console.log('   - Last Activity:', updatedSession.last_activity);
            console.log('   - Topic Count:', updatedSession.topic_count);
        }

        // Clean up test session
        console.log('\n🧹 Cleaning up test session...');
        const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('id', session.id);

        if (deleteError) {
            console.error('❌ Failed to delete test session:', deleteError);
        } else {
            console.log('✅ Test session cleaned up');
        }

        console.log('\n🎉 All session operations working correctly!');
        console.log('💡 The homepage session initialization should now work without errors.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testSessionOperations();
