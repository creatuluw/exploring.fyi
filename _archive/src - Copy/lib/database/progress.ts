/**
 * Progress Tracking Service
 * Handles user learning progress and time tracking
 */

import { supabase, dbHelpers, type Database } from './supabase.js';

type ContentProgress = Database['public']['Tables']['content_progress']['Row'];
type ContentProgressInsert = Database['public']['Tables']['content_progress']['Insert'];
type ContentProgressUpdate = Database['public']['Tables']['content_progress']['Update'];

export class ProgressService {
  /**
   * Track content reading progress
   */
  static async trackContentProgress(
    sessionId: string,
    topicId: string,
    sectionId: string,
    progressPercentage: number
  ): Promise<ContentProgress> {
    try {
      // Validate progress percentage
      if (progressPercentage < 0 || progressPercentage > 100) {
        throw new Error('Progress percentage must be between 0 and 100');
      }

      // Check if progress record already exists
      const { data: existing, error: fetchError } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .eq('section_id', sectionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        dbHelpers.handleError(fetchError);
      }

      if (existing) {
        // Update existing progress
        const updateData: ContentProgressUpdate = {
          progress_percentage: progressPercentage,
          last_viewed: new Date().toISOString(),
          completed: progressPercentage >= 100
        };

        const { data, error } = await supabase
          .from('content_progress')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) dbHelpers.handleError(error);

        return data;
      } else {
        // Create new progress record
        const progressData: ContentProgressInsert = {
          id: dbHelpers.generateId(),
          session_id: sessionId,
          topic_id: topicId,
          section_id: sectionId,
          progress_percentage: progressPercentage,
          completed: progressPercentage >= 100,
          time_spent_seconds: 0,
          last_viewed: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('content_progress')
          .insert(progressData)
          .select()
          .single();

        if (error) dbHelpers.handleError(error);

        console.log('Created progress record:', data.id);
        return data;
      }
    } catch (error) {
      console.error('Failed to track content progress:', error);
      throw error;
    }
  }

  /**
   * Update time spent on content
   */
  static async updateTimeSpent(
    sessionId: string,
    topicId: string,
    sectionId: string,
    additionalSeconds: number
  ): Promise<void> {
    try {
      // Get existing progress record
      const { data: existing, error: fetchError } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .eq('section_id', sectionId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Create new record if none exists
          await this.trackContentProgress(sessionId, topicId, sectionId, 0);
          return this.updateTimeSpent(sessionId, topicId, sectionId, additionalSeconds);
        }
        dbHelpers.handleError(fetchError);
      }

      // Update time spent
      const newTimeSpent = existing.time_spent_seconds + additionalSeconds;

      const { error } = await supabase
        .from('content_progress')
        .update({
          time_spent_seconds: newTimeSpent,
          last_viewed: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) dbHelpers.handleError(error);
    } catch (error) {
      console.error('Failed to update time spent:', error);
      throw error;
    }
  }

  /**
   * Mark a section as completed
   */
  static async markSectionComplete(
    sessionId: string,
    topicId: string,
    sectionId: string
  ): Promise<void> {
    try {
      await this.trackContentProgress(sessionId, topicId, sectionId, 100);
      console.log('Marked section complete:', sectionId);
    } catch (error) {
      console.error('Failed to mark section complete:', error);
      throw error;
    }
  }

  /**
   * Get progress summary for a session
   */
  static async getProgressSummary(sessionId: string) {
    try {
      const { data: progressRecords, error } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId);

      if (error) dbHelpers.handleError(error);

      if (!progressRecords) return null;

      // Calculate summary statistics
      const totalSections = progressRecords.length;
      const completedSections = progressRecords.filter(p => p.completed).length;
      const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.time_spent_seconds, 0);
      const averageProgress = totalSections > 0 
        ? progressRecords.reduce((sum, p) => sum + p.progress_percentage, 0) / totalSections 
        : 0;

      // Get unique topics
      const uniqueTopics = [...new Set(progressRecords.map(p => p.topic_id))];

      // Calculate progress per topic
      const topicProgress = uniqueTopics.map(topicId => {
        const topicRecords = progressRecords.filter(p => p.topic_id === topicId);
        const topicCompleted = topicRecords.filter(p => p.completed).length;
        const topicTotal = topicRecords.length;
        const topicTimeSpent = topicRecords.reduce((sum, p) => sum + p.time_spent_seconds, 0);

        return {
          topic_id: topicId,
          sections_completed: topicCompleted,
          sections_total: topicTotal,
          completion_percentage: topicTotal > 0 ? (topicCompleted / topicTotal) * 100 : 0,
          time_spent_seconds: topicTimeSpent
        };
      });

      return {
        session_id: sessionId,
        total_sections: totalSections,
        completed_sections: completedSections,
        completion_percentage: totalSections > 0 ? (completedSections / totalSections) * 100 : 0,
        total_time_spent_seconds: totalTimeSpent,
        average_progress: averageProgress,
        topics_explored: uniqueTopics.length,
        topic_progress: topicProgress,
        last_activity: progressRecords.length > 0 
          ? Math.max(...progressRecords.map(p => new Date(p.last_viewed).getTime()))
          : null
      };
    } catch (error) {
      console.error('Failed to get progress summary:', error);
      return null;
    }
  }

  /**
   * Get progress for a specific topic
   */
  static async getTopicProgress(sessionId: string, topicId: string) {
    try {
      const { data: progressRecords, error } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .order('section_id');

      if (error) dbHelpers.handleError(error);

      if (!progressRecords) return null;

      const totalSections = progressRecords.length;
      const completedSections = progressRecords.filter(p => p.completed).length;
      const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.time_spent_seconds, 0);

      return {
        topic_id: topicId,
        sections: progressRecords,
        total_sections: totalSections,
        completed_sections: completedSections,
        completion_percentage: totalSections > 0 ? (completedSections / totalSections) * 100 : 0,
        total_time_spent_seconds: totalTimeSpent,
        last_viewed: progressRecords.length > 0
          ? Math.max(...progressRecords.map(p => new Date(p.last_viewed).getTime()))
          : null
      };
    } catch (error) {
      console.error('Failed to get topic progress:', error);
      return null;
    }
  }

  /**
   * Get learning analytics for a session
   */
  static async getLearningAnalytics(sessionId: string) {
    try {
      const progressSummary = await this.getProgressSummary(sessionId);
      if (!progressSummary) return null;

      // Calculate learning patterns
      const { data: progressRecords, error } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('last_viewed');

      if (error) dbHelpers.handleError(error);

      const analytics = {
        ...progressSummary,
        learning_patterns: {
          most_active_hours: this.calculateActiveHours(progressRecords || []),
          reading_speed: this.calculateReadingSpeed(progressRecords || []),
          completion_rate: progressSummary.total_sections > 0 
            ? (progressSummary.completed_sections / progressSummary.total_sections) * 100 
            : 0
        }
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get learning analytics:', error);
      return null;
    }
  }

  /**
   * Calculate most active hours from progress records
   */
  private static calculateActiveHours(progressRecords: ContentProgress[]): number[] {
    const hourCounts: Record<number, number> = {};

    progressRecords.forEach(record => {
      const hour = new Date(record.last_viewed).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Return top 3 most active hours
    return Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  /**
   * Calculate reading speed (sections per hour)
   */
  private static calculateReadingSpeed(progressRecords: ContentProgress[]): number {
    if (progressRecords.length === 0) return 0;

    const totalSections = progressRecords.length;
    const totalTimeHours = progressRecords.reduce((sum, p) => sum + p.time_spent_seconds, 0) / 3600;

    return totalTimeHours > 0 ? totalSections / totalTimeHours : 0;
  }

  /**
   * Delete progress records for a topic
   */
  static async deleteTopicProgress(sessionId: string, topicId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('content_progress')
        .delete()
        .eq('session_id', sessionId)
        .eq('topic_id', topicId);

      if (error) dbHelpers.handleError(error);

      console.log('Deleted progress for topic:', topicId);
      return true;
    } catch (error) {
      console.error('Failed to delete topic progress:', error);
      return false;
    }
  }

  /**
   * Get recent activity (last 24 hours)
   */
  static async getRecentActivity(sessionId: string, hoursBack: number = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      const { data: recentProgress, error } = await supabase
        .from('content_progress')
        .select('*')
        .eq('session_id', sessionId)
        .gte('last_viewed', cutoffTime.toISOString())
        .order('last_viewed', { ascending: false });

      if (error) dbHelpers.handleError(error);

      return recentProgress || [];
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }
}

export default ProgressService;
