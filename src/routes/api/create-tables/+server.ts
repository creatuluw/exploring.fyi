/**
 * API endpoint to create paragraph tables
 * Uses internal Supabase connection to create missing tables
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/database/supabase.js';

const CREATE_PARAGRAPH_PROGRESS_TABLE = `
CREATE TABLE IF NOT EXISTS paragraph_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    topic_id UUID NOT NULL,
    section_id TEXT NOT NULL,
    paragraph_id TEXT NOT NULL,
    paragraph_hash TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, topic_id, section_id, paragraph_id)
);
`;

const CREATE_PARAGRAPH_QA_TABLE = `
CREATE TABLE IF NOT EXISTS paragraph_qa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    topic_id UUID NOT NULL,
    section_id TEXT NOT NULL,
    paragraph_id TEXT NOT NULL,
    paragraph_hash TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    ai_model TEXT DEFAULT 'gemini-2.5-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_paragraph_progress_session_topic ON paragraph_progress(session_id, topic_id);',
  'CREATE INDEX IF NOT EXISTS idx_paragraph_progress_section ON paragraph_progress(session_id, topic_id, section_id);',
  'CREATE INDEX IF NOT EXISTS idx_paragraph_progress_read_status ON paragraph_progress(session_id, topic_id, is_read);',
  'CREATE INDEX IF NOT EXISTS idx_paragraph_qa_session_topic ON paragraph_qa(session_id, topic_id);',
  'CREATE INDEX IF NOT EXISTS idx_paragraph_qa_paragraph ON paragraph_qa(session_id, topic_id, section_id, paragraph_id);',
  'CREATE INDEX IF NOT EXISTS idx_paragraph_qa_created ON paragraph_qa(created_at DESC);'
];

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🔧 [Create Tables API] Starting table creation...');
    
    const results = {
      paragraph_progress: false,
      paragraph_qa: false,
      indexes: [],
      errors: []
    };

    // Try to create paragraph_progress table
    try {
      // First check if table exists by trying to query it
      const { error: checkError } = await supabase
        .from('paragraph_progress')
        .select('count')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('📊 [Create Tables API] Creating paragraph_progress table...');
        
        // Use a workaround: try to execute via stored procedure if available
        const { error: createError } = await supabase.rpc('execute_sql', { 
          query: CREATE_PARAGRAPH_PROGRESS_TABLE 
        });
        
        if (createError) {
          // Fallback: The table creation might fail but we'll note it
          console.log('⚠️ [Create Tables API] Direct creation failed, table may need manual creation');
          results.errors.push(`paragraph_progress: ${createError.message}`);
        } else {
          results.paragraph_progress = true;
          console.log('✅ [Create Tables API] paragraph_progress table created');
        }
      } else {
        results.paragraph_progress = true;
        console.log('✅ [Create Tables API] paragraph_progress table already exists');
      }
    } catch (error) {
      console.error('❌ [Create Tables API] Error with paragraph_progress:', error);
      results.errors.push(`paragraph_progress: ${error.message}`);
    }

    // Try to create paragraph_qa table
    try {
      const { error: checkError } = await supabase
        .from('paragraph_qa')
        .select('count')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('📊 [Create Tables API] Creating paragraph_qa table...');
        
        const { error: createError } = await supabase.rpc('execute_sql', { 
          query: CREATE_PARAGRAPH_QA_TABLE 
        });
        
        if (createError) {
          console.log('⚠️ [Create Tables API] Direct creation failed, table may need manual creation');
          results.errors.push(`paragraph_qa: ${createError.message}`);
        } else {
          results.paragraph_qa = true;
          console.log('✅ [Create Tables API] paragraph_qa table created');
        }
      } else {
        results.paragraph_qa = true;
        console.log('✅ [Create Tables API] paragraph_qa table already exists');
      }
    } catch (error) {
      console.error('❌ [Create Tables API] Error with paragraph_qa:', error);
      results.errors.push(`paragraph_qa: ${error.message}`);
    }

    // Create indexes if tables were created
    if (results.paragraph_progress || results.paragraph_qa) {
      for (const indexSQL of CREATE_INDEXES) {
        try {
          const { error: indexError } = await supabase.rpc('execute_sql', { 
            query: indexSQL 
          });
          
          if (!indexError) {
            results.indexes.push(indexSQL.split(' ')[5]); // Extract index name
          }
        } catch (error) {
          // Index creation is not critical
          console.log('⚠️ [Create Tables API] Index creation skipped:', error.message);
        }
      }
    }

    const success = results.paragraph_progress && results.paragraph_qa;
    
    return json({
      success,
      message: success 
        ? 'Tables created successfully'
        : 'Tables creation incomplete - manual setup may be required',
      results,
      sql: {
        paragraph_progress: CREATE_PARAGRAPH_PROGRESS_TABLE,
        paragraph_qa: CREATE_PARAGRAPH_QA_TABLE,
        indexes: CREATE_INDEXES
      }
    });

  } catch (error) {
    console.error('❌ [Create Tables API] Fatal error:', error);
    
    return json({
      success: false,
      error: 'Table creation failed',
      message: 'Please create tables manually using the provided SQL',
      sql: {
        paragraph_progress: CREATE_PARAGRAPH_PROGRESS_TABLE,
        paragraph_qa: CREATE_PARAGRAPH_QA_TABLE,
        indexes: CREATE_INDEXES
      }
    }, { status: 500 });
  }
};

