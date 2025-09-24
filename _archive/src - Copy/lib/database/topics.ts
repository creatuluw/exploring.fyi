/**
 * Topics Service
 * Handles topic analysis results and mind map data storage
 */

import { supabase, dbHelpers, type Database } from './supabase.js';

type Topic = Database['public']['Tables']['topics']['Row'];
type TopicInsert = Database['public']['Tables']['topics']['Insert'];
type TopicUpdate = Database['public']['Tables']['topics']['Update'];

export class TopicsService {
  /**
   * Get or create topic with deterministic ID to prevent duplicates
   * Returns existing topic if found, or creates new one with deterministic ID
   */
  static async getOrCreateTopic(
    sessionId: string,
    title: string,
    sourceType: 'topic' | 'url',
    sourceUrl?: string,
    mindMapData?: Record<string, any>
  ): Promise<{ topic: Topic; isExisting: boolean }> {
    try {
      // Use session ID as user identifier for deterministic ID generation
      const deterministicId = await dbHelpers.generateTopicId(title.trim(), sessionId);
      
      console.log(`🔍 [Topics] Checking for existing topic with ID: ${deterministicId}`);
      
      // Check if topic already exists
      const existingTopic = await this.getTopicById(deterministicId);
      
      if (existingTopic) {
        console.log(`✅ [Topics] Found existing topic: "${existingTopic.title}" (${existingTopic.id})`);
        
        // Enhance existing topic with mind map info
        let mindMapDetails = null;
        if (existingTopic.mind_map_data && existingTopic.mind_map_data.mindMapId) {
          try {
            const { data: mindMap } = await supabase
              .from('mind_maps')
              .select('*')
              .eq('id', existingTopic.mind_map_data.mindMapId)
              .single();
            
            if (mindMap) {
              mindMapDetails = {
                id: mindMap.id,
                nodeCount: mindMap.nodes.length,
                edgeCount: mindMap.edges.length,
                lastUpdated: mindMap.updated_at
              };
            }
          } catch (error) {
            console.warn('Failed to load mind map details for existing topic:', error);
          }
        }
        
        const enhancedTopic = {
          ...existingTopic,
          mindMap: mindMapDetails
        };
        
        return { topic: enhancedTopic, isExisting: true };
      }
      
      // Create new topic with deterministic ID
      console.log(`📝 [Topics] Creating new topic with deterministic ID: ${deterministicId}`);
      const topicData: TopicInsert = {
        id: deterministicId,
        session_id: sessionId,
        title: title.trim(),
        source_type: sourceType,
        source_url: sourceUrl || null,
        mind_map_data: mindMapData || null
      };

      const { data, error } = await supabase
        .from('topics')
        .insert(topicData)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('✅ [Topics] Created new topic:', data.id, title);
      return { topic: data, isExisting: false };
    } catch (error) {
      console.error('❌ [Topics] Failed to get or create topic:', error);
      throw error;
    }
  }

  /**
   * Save a new topic analysis result (legacy method - kept for backwards compatibility)
   */
  static async saveTopic(
    sessionId: string,
    title: string,
    sourceType: 'topic' | 'url',
    sourceUrl?: string,
    mindMapData?: Record<string, any>
  ): Promise<Topic> {
    const result = await this.getOrCreateTopic(sessionId, title, sourceType, sourceUrl, mindMapData);
    return result.topic;
  }

  /**
   * Get topic by ID
   */
  static async getTopicById(topicId: string): Promise<Topic | null> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Topic not found
        }
        dbHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      console.error('Failed to get topic:', error);
      return null;
    }
  }

  /**
   * Update topic with new content (like mind map data)
   */
  static async updateTopicContent(
    topicId: string,
    updates: {
      mindMapData?: Record<string, any>;
      title?: string;
    }
  ): Promise<Topic | null> {
    try {
      const updateData: TopicUpdate = {
        updated_at: new Date().toISOString()
      };

      if (updates.mindMapData) {
        updateData.mind_map_data = updates.mindMapData;
      }

      if (updates.title) {
        updateData.title = updates.title.trim();
      }

      const { data, error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('Updated topic content:', topicId);
      return data;
    } catch (error) {
      console.error('Failed to update topic content:', error);
      throw error;
    }
  }

  /**
   * Get topic exploration history for a session
   */
  static async getTopicHistory(
    sessionId: string,
    limit: number = 20
  ): Promise<Topic[]> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get topic history:', error);
      return [];
    }
  }

  /**
   * Search topics by title
   */
  static async searchTopics(
    sessionId: string,
    query: string,
    limit: number = 10
  ): Promise<Topic[]> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('session_id', sessionId)
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to search topics:', error);
      return [];
    }
  }

  /**
   * Get recent topics across all sessions (for trending analysis)
   */
  static async getRecentTopics(limit: number = 50): Promise<Pick<Topic, 'title' | 'source_type' | 'created_at'>[]> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('title, source_type, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get recent topics:', error);
      return [];
    }
  }

  /**
   * Find existing topic by title (case-insensitive, any session)
   */
  static async findExistingTopicByTitle(title: string): Promise<Topic | null> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .ilike('title', title.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error finding existing topic:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Failed to find existing topic:', error);
      return null;
    }
  }

  /**
   * Find existing topic by URL (exact match, any session)
   */
  static async findExistingTopicByUrl(url: string): Promise<Topic | null> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('source_url', url.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error finding existing topic by URL:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Failed to find existing topic by URL:', error);
      return null;
    }
  }

  /**
   * Get topic analytics for a session
   */
  static async getTopicAnalytics(sessionId: string) {
    try {
      const { data: topics, error } = await supabase
        .from('topics')
        .select('source_type, created_at')
        .eq('session_id', sessionId);

      if (error) dbHelpers.handleError(error);

      if (!topics) return null;

      // Analyze topic patterns
      const bySourceType = topics.reduce((acc, topic) => {
        acc[topic.source_type] = (acc[topic.source_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Analyze activity by time periods
      const now = new Date();
      const last24h = topics.filter(t => 
        new Date(t.created_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
      ).length;

      const last7days = topics.filter(t => 
        new Date(t.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      return {
        total_topics: topics.length,
        by_source_type: bySourceType,
        last_24_hours: last24h,
        last_7_days: last7days
      };
    } catch (error) {
      console.error('Failed to get topic analytics:', error);
      return null;
    }
  }

  /**
   * Delete a topic and all associated data
   */
  static async deleteTopic(topicId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [DB] Starting comprehensive deletion for topic: ${topicId}`);
      
      // Get topic details first to know what to clean up
      const topic = await this.getTopicById(topicId);
      if (!topic) {
        console.warn(`⚠️ [DB] Topic ${topicId} not found for deletion`);
        return false;
      }

      // Delete associated mind maps
      console.log(`🗑️ [DB] Deleting mind maps for topic: ${topicId}`);
      const { error: mindMapError } = await supabase
        .from('mind_maps')
        .delete()
        .eq('topic_id', topicId);

      if (mindMapError) {
        console.warn('⚠️ [DB] Error deleting mind maps:', mindMapError);
      }

      // Delete associated sources
      console.log(`🗑️ [DB] Deleting sources for topic: ${topicId}`);
      const { error: sourcesError } = await supabase
        .from('sources')
        .delete()
        .eq('topic_id', topicId);

      if (sourcesError) {
        console.warn('⚠️ [DB] Error deleting sources:', sourcesError);
      }

      // Delete associated content progress
      console.log(`🗑️ [DB] Deleting content progress for topic: ${topicId}`);
      const { error: progressError } = await supabase
        .from('content_progress')
        .delete()
        .eq('topic_id', topicId);

      if (progressError) {
        console.warn('⚠️ [DB] Error deleting content progress:', progressError);
      }

      // Delete associated AI generations
      console.log(`🗑️ [DB] Deleting AI generations for topic: ${topicId}`);
      const { error: aiGenError } = await supabase
        .from('ai_generations')
        .delete()
        .eq('topic_id', topicId);

      if (aiGenError) {
        console.warn('⚠️ [DB] Error deleting AI generations:', aiGenError);
      }

      // Finally, delete the topic itself
      console.log(`🗑️ [DB] Deleting topic record: ${topicId}`);
      const { error: topicError } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (topicError) {
        console.error('❌ [DB] Error deleting topic:', topicError);
        dbHelpers.handleError(topicError);
      }

      // Update session topic count if we have a session
      if (topic.session_id) {
        console.log(`🔄 [DB] Decrementing topic count for session: ${topic.session_id}`);
        const { SessionService } = await import('./sessions.js');
        await SessionService.decrementTopicCount(topic.session_id);
      }

      console.log(`✅ [DB] Successfully deleted topic and all associated data: ${topicId}`);
      return true;
    } catch (error) {
      console.error('❌ [DB] Failed to delete topic:', error);
      return false;
    }
  }

  /**
   * Get topic with associated mind map and sources
   */
  static async getTopicWithDetails(topicId: string) {
    try {
      // Get the topic
      const topic = await this.getTopicById(topicId);
      if (!topic) return null;

      // Get associated mind maps
      const { data: mindMaps, error: mindMapError } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (mindMapError) console.warn('Failed to get mind maps:', mindMapError);

      // Get associated sources
      const { data: sources, error: sourcesError } = await supabase
        .from('sources')
        .select('*')
        .eq('topic_id', topicId)
        .order('credibility_score', { ascending: false });

      if (sourcesError) console.warn('Failed to get sources:', sourcesError);

      return {
        topic,
        mind_maps: mindMaps || [],
        sources: sources || []
      };
    } catch (error) {
      console.error('Failed to get topic with details:', error);
      return null;
    }
  }
}

export default TopicsService;
