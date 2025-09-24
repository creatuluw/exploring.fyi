/**
 * Content Cache Service
 * Handles caching and retrieval of generated content to avoid regeneration
 */

import { supabase, dbHelpers, type Database } from './supabase.js';
import type { DetailedContentPage } from '../types/index.js';
import type { ContentMetadata, ContentSection } from '../services/streamingContentGeneration.js';

type AIGeneration = Database['public']['Tables']['ai_generations']['Row'];
type AIGenerationInsert = Database['public']['Tables']['ai_generations']['Insert'];

export class ContentCacheService {
  /**
   * Generate a deterministic cache key for content
   */
  private static generateCacheKey(topic: string, context?: string, difficulty?: string): string {
    const normalizedTopic = topic.toLowerCase().trim();
    const normalizedContext = context?.toLowerCase().trim() || '';
    const normalizedDifficulty = difficulty || 'intermediate';
    
    return `${normalizedTopic}||${normalizedContext}||${normalizedDifficulty}`;
  }

  /**
   * Check if content exists in cache
   */
  static async getCachedContent(
    topicId: string, 
    topic: string, 
    context?: string, 
    difficulty?: string
  ): Promise<DetailedContentPage | null> {
    try {
      const cacheKey = this.generateCacheKey(topic, context, difficulty);
      
      console.log(`🔍 [Content Cache] Checking cache for: "${topic}" (key: ${cacheKey})`);

      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('topic_id', topicId)
        .eq('content_type', 'content_page')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('❌ [Content Cache] Error checking cache:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log(`📭 [Content Cache] No cached content found for: "${topic}"`);
        return null;
      }

      const cachedGeneration = data[0];
      
      // Verify the cache key matches (ensures same parameters)
      const inputData = cachedGeneration.input_data;
      const storedCacheKey = inputData?.cacheKey;
      
      if (storedCacheKey !== cacheKey) {
        console.log(`🔄 [Content Cache] Cache key mismatch, content parameters changed for: "${topic}"`);
        return null;
      }

      const cachedContent = cachedGeneration.generated_content;
      if (!cachedContent) {
        console.log(`⚠️ [Content Cache] Cached entry exists but content is null for: "${topic}"`);
        return null;
      }

      console.log(`✅ [Content Cache] Found cached content for: "${topic}" (generated: ${cachedGeneration.created_at})`);
      
      // Return the cached content with updated timestamp
      return {
        ...cachedContent,
        lastUpdated: new Date(cachedGeneration.created_at)
      } as DetailedContentPage;

    } catch (error) {
      console.error('❌ [Content Cache] Error retrieving cached content:', error);
      return null;
    }
  }

  /**
   * Save generated content to cache
   */
  static async cacheContent(
    topicId: string,
    topic: string,
    contentPage: DetailedContentPage,
    context?: string,
    difficulty?: string,
    processingTimeMs?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(topic, context, difficulty);
      
      console.log(`💾 [Content Cache] Saving content to cache for: "${topic}"`);

      const generationData: AIGenerationInsert = {
        topic_id: topicId,
        content_type: 'content_page',
        input_data: {
          topic,
          context,
          difficulty: difficulty || 'intermediate',
          cacheKey,
          originalTopic: topic // Store original for debugging
        },
        generated_content: contentPage,
        processing_time_ms: processingTimeMs || null
      };

      const { error } = await supabase
        .from('ai_generations')
        .insert(generationData);

      if (error) {
        console.error('❌ [Content Cache] Error saving to cache:', error);
        // Don't throw error - caching failure shouldn't break content generation
        return;
      }

      console.log(`✅ [Content Cache] Successfully cached content for: "${topic}"`);
      
    } catch (error) {
      console.error('❌ [Content Cache] Error in cacheContent:', error);
      // Don't throw error - caching failure shouldn't break content generation
    }
  }

  /**
   * Clear cache for a specific topic (useful for forcing regeneration)
   */
  static async clearTopicCache(topicId: string): Promise<void> {
    try {
      console.log(`🗑️ [Content Cache] Clearing cache for topic: ${topicId}`);

      const { error } = await supabase
        .from('ai_generations')
        .delete()
        .eq('topic_id', topicId)
        .eq('content_type', 'content_page');

      if (error) {
        console.error('❌ [Content Cache] Error clearing cache:', error);
        throw error;
      }

      console.log(`✅ [Content Cache] Successfully cleared cache for topic: ${topicId}`);
      
    } catch (error) {
      console.error('❌ [Content Cache] Error in clearTopicCache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(): Promise<{
    totalCachedPages: number;
    oldestCache: string | null;
    newestCache: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('created_at')
        .eq('content_type', 'content_page')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [Content Cache] Error getting cache stats:', error);
        return { totalCachedPages: 0, oldestCache: null, newestCache: null };
      }

      const totalCachedPages = data?.length || 0;
      const oldestCache = data && data.length > 0 ? data[0].created_at : null;
      const newestCache = data && data.length > 0 ? data[data.length - 1].created_at : null;

      return {
        totalCachedPages,
        oldestCache,
        newestCache
      };
    } catch (error) {
      console.error('❌ [Content Cache] Error in getCacheStats:', error);
      return { totalCachedPages: 0, oldestCache: null, newestCache: null };
    }
  }

  /**
   * Check if content needs regeneration based on age
   */
  static async shouldRegenerateContent(
    topicId: string,
    maxAgeHours: number = 24 * 7 // Default: 7 days
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('created_at')
        .eq('topic_id', topicId)
        .eq('content_type', 'content_page')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return true; // No cache found, needs generation
      }

      const cacheAge = Date.now() - new Date(data[0].created_at).getTime();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      return cacheAge > maxAgeMs;
    } catch (error) {
      console.error('❌ [Content Cache] Error checking content age:', error);
      return true; // On error, assume regeneration needed
    }
  }
}
