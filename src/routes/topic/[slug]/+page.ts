import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { supabase, dbHelpers } from '$lib/database/supabase.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const topicSlug = params.slug;
  const difficulty = url.searchParams.get('difficulty') as 'beginner' | 'intermediate' | 'advanced' | null;
  const topicFromUrl = url.searchParams.get('topic');
  const contextFromUrl = url.searchParams.get('context');
  const parentTopicFromUrl = url.searchParams.get('parentTopic'); // Legacy support
  
  // Smart resumption parameters
  const isResumption = url.searchParams.get('resumption') === 'true';
  const progressParam = url.searchParams.get('progress');
  const targetChapterId = url.searchParams.get('chapter');
  const targetParagraphId = url.searchParams.get('paragraph');

  try {
    console.log(`📝 [Page Load] Loading topic data for slug: ${topicSlug}`);
    
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
    
    // Use the topic slug as-is - this is now our primary identifier
    console.log(`🔍 [Page Load] Querying database for topic slug: ${topicSlug}`);
    
    let topicData = null;
    let dbError = null;
    let actualTopicId = topicSlug; // Use slug directly
    
    // Try to get session for database query
    const sessionState = get(session);
    
    if (sessionState?.id) {
      try {
        // First try to find topic by exact slug match (new system)
        console.log(`🔍 [Page Load] Trying exact slug match for: ${topicSlug}`);
        const slugResult = await supabase
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
          .eq('slug', topicSlug) // Query by slug field, not id
          .maybeSingle();
        
        console.log(`🔍 [Page Load] Slug query result:`, slugResult);
        
        if (slugResult.data) {
          topicData = slugResult.data;
          actualTopicId = topicSlug; // Keep using the slug for content generation
          console.log(`✅ [Page Load] Found topic by slug: "${topicData.title}" (UUID: ${topicData.id}, Slug: ${topicSlug})`);
        } else {
          // Fallback: Search by session_id + topic title combination
          const searchTitle = topicFromUrl || topicSlug.replace(/-/g, ' ');
          console.log(`🔍 [Page Load] Searching for topic "${searchTitle}" in session ${sessionState.id}`);
          
          const titleResult = await supabase
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
            .eq('session_id', sessionState.id)
            .ilike('title', searchTitle) // Case-insensitive match
            .maybeSingle();
          
          topicData = titleResult.data;
          dbError = titleResult.error;
          
          if (topicData) {
            actualTopicId = topicSlug; // Use the slug for content generation consistency
            console.log(`✅ [Page Load] Found existing topic by title: "${topicData.title}" (UUID: ${topicData.id}, using slug: ${topicSlug})`);
          } else {
            console.log(`ℹ️ [Page Load] No existing topic found for "${searchTitle}" in session ${sessionState.id}`);
          }
        }
        
        if (dbError) {
          console.warn(`⚠️ [Page Load] Database query returned error:`, dbError);
        }
      } catch (error) {
        console.warn(`⚠️ [Page Load] Database query failed (will continue with content generation):`, error);
        dbError = error;
      }
    } else {
      console.log(`⚠️ [Page Load] No session available yet, will use slug for content generation`);
    }

    if (topicData && !dbError) {
      console.log(`✅ [Page Load] Found existing topic in database: "${topicData.title}"`);
      return {
        topicId: actualTopicId, // Use the slug for content generation consistency
        topic: topicData.title,
        context: legacyContext || topicData.source_url || undefined,
        enhancedContext,
        difficulty: difficulty || 'intermediate',
        topicData,
        resumption: {
          isResumption,
          progress: progressParam ? parseInt(progressParam) : null,
          targetChapterId,
          targetParagraphId
        }
      };
    }

    // If not found in database, check if we have topic info from URL parameters
    if (topicFromUrl) {
      console.log(`📝 [Page Load] Creating content page for topic from URL: "${topicFromUrl}"`);
      return {
        topicId: topicSlug, // Use the slug directly
        topic: topicFromUrl,
        context: legacyContext || parentTopicFromUrl || undefined,
        enhancedContext,
        difficulty: difficulty || 'intermediate',
        topicData: null, // No database record, will generate content on-the-fly
        resumption: {
          isResumption,
          progress: progressParam ? parseInt(progressParam) : null,
          targetChapterId,
          targetParagraphId
        }
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