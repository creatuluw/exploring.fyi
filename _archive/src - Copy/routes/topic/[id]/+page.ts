import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/database/supabase.js';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const topicId = params.id;
  const difficulty = url.searchParams.get('difficulty') as 'beginner' | 'intermediate' | 'advanced' | null;
  const topicFromUrl = url.searchParams.get('topic');
  const contextFromUrl = url.searchParams.get('context');
  const parentTopicFromUrl = url.searchParams.get('parentTopic'); // Legacy support

  try {
    console.log(`📝 [Page Load] Loading topic data for ID: ${topicId}`);
    
    // Parse enhanced context if available
    let enhancedContext = null;
    let legacyContext = contextFromUrl;
    
    if (contextFromUrl) {
      try {
        // Try to parse as JSON for enhanced context
        enhancedContext = JSON.parse(contextFromUrl);
        console.log(`📋 [Page Load] Parsed enhanced context:`, enhancedContext);
      } catch {
        // Fallback to legacy string context
        legacyContext = contextFromUrl;
        console.log(`📋 [Page Load] Using legacy context: "${legacyContext}"`);
      }
    }
    
    // First try to fetch topic from database using the ID
    const { data: topicData, error: dbError } = await supabase
      .from('topics')
      .select(`
        id,
        title,
        source_url,
        source_type,
        mind_map_data,
        created_at,
        updated_at
      `)
      .eq('id', topicId)
      .single();

    if (topicData && !dbError) {
      console.log(`✅ [Page Load] Found existing topic in database: "${topicData.title}"`);
      return {
        topicId,
        topic: topicData.title,
        context: legacyContext || topicData.source_url || undefined,
        enhancedContext,
        difficulty: difficulty || 'intermediate',
        topicData
      };
    }

    // If not found in database, check if we have topic info from URL parameters
    if (topicFromUrl) {
      console.log(`📝 [Page Load] Creating content page for topic from URL: "${topicFromUrl}"`);
      return {
        topicId,
        topic: topicFromUrl,
        context: legacyContext || parentTopicFromUrl || undefined,
        enhancedContext,
        difficulty: difficulty || 'intermediate',
        topicData: null // No database record, will generate content on-the-fly
      };
    }

    // Neither database record nor URL parameters found
    console.error('❌ [Page Load] Topic not found and no URL parameters provided');
    throw error(404, 'Topic not found');
    
  } catch (err) {
    console.error('❌ [Page Load] Error loading topic page:', err);
    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Failed to load topic content');
  }
};
