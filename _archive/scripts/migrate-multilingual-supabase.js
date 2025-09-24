/**
 * Multilingual Support Migration using Supabase Client
 * Adds language columns to existing database tables
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kong-production-413c.up.railway.app';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4MjA3NDUzLCJleHAiOjIwNzM1Njc0NTN9.IuVfikFs4uPectjmuYte4TqlsL_12_brJpD4rNEeChE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  try {
    console.log('🚀 Starting multilingual support migration via Supabase...');
    
    // Check current table structure
    console.log('📊 Checking current sessions table structure...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1);
      
    if (sessionError) {
      console.error('❌ Error accessing sessions table:', sessionError);
      return;
    }
    
    console.log('✅ Sessions table accessible');
    if (sessionData && sessionData.length > 0) {
      console.log('📋 Current session columns:', Object.keys(sessionData[0]));
    }
    
    // Check if language columns already exist
    const sampleSession = sessionData?.[0];
    const hasLanguageColumns = sampleSession && 
      'interface_language' in sampleSession &&
      'ai_input_language' in sampleSession &&
      'ai_output_language' in sampleSession;
    
    if (hasLanguageColumns) {
      console.log('✅ Language columns already exist in sessions table');
    } else {
      console.log('⚠️  Language columns missing - manual SQL migration required');
    }
    
    // Check topics table
    console.log('\n📊 Checking current topics table structure...');
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .limit(1);
      
    if (topicsError) {
      console.error('❌ Error accessing topics table:', topicsError);
      return;
    }
    
    console.log('✅ Topics table accessible');
    if (topicsData && topicsData.length > 0) {
      console.log('📋 Current topic columns:', Object.keys(topicsData[0]));
    }
    
    const sampleTopic = topicsData?.[0];
    const hasTopicLanguageColumns = sampleTopic && 
      'content_language' in sampleTopic &&
      'original_language' in sampleTopic;
    
    if (hasTopicLanguageColumns) {
      console.log('✅ Language columns already exist in topics table');
    } else {
      console.log('⚠️  Language columns missing in topics table');
    }
    
    // Since we can't run DDL through Supabase REST API, let's provide manual SQL
    if (!hasLanguageColumns || !hasTopicLanguageColumns) {
      console.log('\n📝 Manual SQL commands needed:');
      console.log('\nRun these SQL commands in Supabase Studio or pgAdmin:');
      console.log('```sql');
      
      if (!hasLanguageColumns) {
        console.log('-- Add language columns to sessions table');
        console.log('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interface_language VARCHAR(5) DEFAULT \'en\';');
        console.log('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_input_language VARCHAR(5) DEFAULT \'en\';');
        console.log('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_output_language VARCHAR(5) DEFAULT \'en\';');
      }
      
      if (!hasTopicLanguageColumns) {
        console.log('\n-- Add language columns to topics table');
        console.log('ALTER TABLE topics ADD COLUMN IF NOT EXISTS content_language VARCHAR(5) DEFAULT \'en\';');
        console.log('ALTER TABLE topics ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) DEFAULT \'en\';');
      }
      
      console.log('\n-- Add language column to mind_maps table');
      console.log('ALTER TABLE mind_maps ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT \'en\';');
      
      console.log('\n-- Add language columns to ai_generations table');
      console.log('ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS input_language VARCHAR(5) DEFAULT \'en\';');
      console.log('ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS output_language VARCHAR(5) DEFAULT \'en\';');
      
      console.log('\n-- Update existing records');
      console.log('UPDATE sessions SET interface_language = \'en\', ai_input_language = \'en\', ai_output_language = \'en\' WHERE interface_language IS NULL;');
      console.log('UPDATE topics SET content_language = \'en\', original_language = \'en\' WHERE content_language IS NULL;');
      console.log('UPDATE mind_maps SET language = \'en\' WHERE language IS NULL;');
      console.log('UPDATE ai_generations SET input_language = \'en\', output_language = \'en\' WHERE input_language IS NULL;');
      console.log('```');
    }
    
    console.log('\n🎉 Migration check completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration check
runMigration().catch(console.error);
