import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, url, fetch }) => {
  const topicId = params.id;
  const topic = url.searchParams.get('topic');
  const context = url.searchParams.get('context');
  const difficulty = url.searchParams.get('difficulty') as 'beginner' | 'intermediate' | 'advanced' | null;

  if (!topic) {
    throw error(400, 'Topic parameter is required');
  }

  try {
    // Generate content page for this topic
    console.log(`📝 [Page Load] Loading content for topic: "${topic}" (ID: ${topicId})`);
    
    // Note: We'll generate content on the client side for now
    // In a production app, this could be cached or pre-generated
    
    return {
      topicId,
      topic,
      context,
      difficulty: difficulty || 'intermediate'
    };
  } catch (err) {
    console.error('❌ [Page Load] Error loading topic page:', err);
    throw error(500, 'Failed to load topic content');
  }
};
