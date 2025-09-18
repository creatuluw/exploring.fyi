/**
 * Session Management Service
 * Handles anonymous session creation and persistence with Supabase
 */

import { supabase, dbHelpers } from './supabase.js';

interface Session {
  id: string;
  user_id: string | null;
  settings: Record<string, any> | null;
  last_activity: string;
  created_at: string;
  topic_count: number;
}

interface SessionInsert {
  id?: string;
  user_id?: string | null;
  settings?: Record<string, any> | null;
  last_activity?: string;
  created_at?: string;
  topic_count?: number;
}

interface SessionUpdate {
  id?: string;
  user_id?: string | null;
  settings?: Record<string, any> | null;
  last_activity?: string;
  created_at?: string;
  topic_count?: number;
}

export class SessionService {
  /**
   * Create a new anonymous session
   */
  static async createAnonymousSession(settings?: Record<string, any>): Promise<Session> {
    try {
      const sessionData: SessionInsert = {
        id: dbHelpers.generateId(),
        user_id: null, // Anonymous sessions have no user_id
        settings: settings || {},
        last_activity: new Date().toISOString(),
        topic_count: 0
      };

      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error || !data) dbHelpers.handleError(error || new Error('No data returned'));

      console.log('Created anonymous session:', data.id);
      return data;
    } catch (error) {
      console.error('Failed to create anonymous session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<Session | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Session not found
          return null;
        }
        dbHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session activity timestamp
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          last_activity: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) dbHelpers.handleError(error);
    } catch (error) {
      console.error('Failed to update session activity:', error);
      throw error;
    }
  }

  /**
   * Update session settings
   */
  static async updateSessionSettings(
    sessionId: string, 
    settings: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          settings,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) dbHelpers.handleError(error);
    } catch (error) {
      console.error('Failed to update session settings:', error);
      throw error;
    }
  }

  /**
   * Increment topic count for session
   */
  static async incrementTopicCount(sessionId: string): Promise<void> {
    try {
      // Get current session to increment topic count
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const { error } = await supabase
        .from('sessions')
        .update({ 
          topic_count: session.topic_count + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) dbHelpers.handleError(error);
    } catch (error) {
      console.error('Failed to increment topic count:', error);
      throw error;
    }
  }

  /**
   * Get all topics for a session (for history)
   */
  static async getSessionTopics(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get session topics:', error);
      return [];
    }
  }

  /**
   * Clean up old inactive sessions (for maintenance)
   */
  static async cleanupOldSessions(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('sessions')
        .delete()
        .lt('last_activity', cutoffDate.toISOString());

      if (error) dbHelpers.handleError(error);

      console.log(`Cleaned up sessions older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(sessionId: string) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return null;

      const topics = await this.getSessionTopics(sessionId);
      
      // Calculate total time spent (if we have progress data)
      const { data: progressData } = await supabase
        .from('content_progress')
        .select('time_spent_seconds')
        .eq('session_id', sessionId);

      const totalTimeSpent = progressData?.reduce(
        (sum, record) => sum + record.time_spent_seconds, 0
      ) || 0;

      return {
        session_id: sessionId,
        created_at: session.created_at,
        last_activity: session.last_activity,
        topic_count: session.topic_count,
        recent_topics: topics.slice(0, 5), // 5 most recent topics
        total_time_spent_seconds: totalTimeSpent,
        settings: session.settings
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return null;
    }
  }
}

export default SessionService;
