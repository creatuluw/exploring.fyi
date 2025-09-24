// Check database status
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kong-production-5096.up.railway.app',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ'
);

async function checkDatabase() {
  try {
    console.log('🔍 Checking mind_maps table...');
    
    // Check if mind_maps table exists and what data it contains
    const { data: mindMaps, error: mindMapsError } = await supabase
      .from('mind_maps')
      .select('*');
    
    if (mindMapsError) {
      console.error('❌ Error querying mind_maps:', mindMapsError);
    } else {
      console.log(`📊 Found ${mindMaps.length} mind maps:`);
      mindMaps.forEach(mm => {
        console.log(`  - ID: ${mm.id}, Slug: ${mm.slug}, Topic ID: ${mm.topic_id}`);
      });
    }
    
    console.log('\n🔍 Checking topics table...');
    
    // Check topics that might relate to "websites bouwen"
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .ilike('title', '%websites%');
    
    if (topicsError) {
      console.error('❌ Error querying topics:', topicsError);
    } else {
      console.log(`📊 Found ${topics.length} topics containing "websites":`);
      topics.forEach(topic => {
        console.log(`  - ID: ${topic.id}, Title: "${topic.title}", Slug: ${topic.slug}`);
      });
    }
    
    // Also check for "bouwen"
    const { data: topics2, error: topicsError2 } = await supabase
      .from('topics')
      .select('*')
      .ilike('title', '%bouwen%');
    
    if (topicsError2) {
      console.error('❌ Error querying topics for bouwen:', topicsError2);
    } else {
      console.log(`📊 Found ${topics2.length} topics containing "bouwen":`);
      topics2.forEach(topic => {
        console.log(`  - ID: ${topic.id}, Title: "${topic.title}", Slug: ${topic.slug}`);
      });
    }
    
    // Check for the specific mindmap slug
    console.log('\n🔍 Checking for specific mindmap slug...');
    const { data: specificMindMap, error: specificError } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('slug', 'websites-bouwen-mindmap');
    
    if (specificError) {
      console.error('❌ Error querying specific mindmap:', specificError);
    } else {
      console.log(`📊 Mindmap with slug "websites-bouwen-mindmap": ${specificMindMap.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
      if (specificMindMap.length > 0) {
        console.log('  Details:', specificMindMap[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();
