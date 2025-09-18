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
   * Save a new topic analysis result
   */
  static async saveTopic(
    sessionId: string,
    title: string,
    sourceType: 'topic' | 'url',
    sourceUrl?: string,
    mindMapData?: Record<string, any>
  ): Promise<Topic> {
    try {
      const topicData: TopicInsert = {
        id: dbHelpers.generateId(),
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

      console.log('Saved topic:', data.id, title);
      return data;
    } catch (error) {
      console.error('Failed to save topic:', error);
      throw error;
    }
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
   * Delete a topic and associated data
   */
  static async deleteTopic(topicId: string): Promise<boolean> {
    try {
      // Note: This should also clean up associated mind_maps, sources, etc.
      // In a production environment, you'd want to handle cascading deletes properly
      
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) dbHelpers.handleError(error);

      console.log('Deleted topic:', topicId);
      return true;
    } catch (error) {
      console.error('Failed to delete topic:', error);
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
