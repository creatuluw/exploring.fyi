/**
 * Chapter Checks Service
 * Handles chapter assessment storage and retrieval
 */

import { supabase, type Database } from './supabase.js';
import type { ChapterCheckAttempt, ChapterCheckQuestion, ChapterCheckAnswer } from '$lib/types/index.js';

type ChecksDone = Database['public']['Tables']['checks_done']['Row'];
type ChecksDoneInsert = Database['public']['Tables']['checks_done']['Insert'];

export class ChecksService {
  /**
   * Save a chapter check attempt
   */
  static async saveCheckAttempt(
    sessionId: string,
    topicId: string,
    chapterId: string,
    questions: ChapterCheckQuestion[],
    answers: ChapterCheckAnswer[],
    score: number,
    aiFeedback?: Record<string, any>,
    model?: string,
    durationSeconds?: number
  ): Promise<ChapterCheckAttempt> {
    try {
      console.log(`📝 [Checks] Saving check attempt for chapter ${chapterId}, score: ${score}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .insert({
          session_id: sessionId,
          topic_id: topicId,
          chapter_id: chapterId,
          questions,
          answers,
          ai_feedback: aiFeedback,
          score,
          model,
          duration_seconds: durationSeconds
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Checks] Error saving check attempt:', error);
        throw error;
      }

      console.log(`✅ [Checks] Saved check attempt: ${data.id}`);
      return this.mapToCheckAttempt(data);
    } catch (error) {
      console.error('❌ [Checks] Failed to save check attempt:', error);
      throw error;
    }
  }

  /**
   * Get all check attempts for a chapter
   */
  static async getCheckAttemptsByChapter(chapterId: string): Promise<ChapterCheckAttempt[]> {
    try {
      console.log(`🔍 [Checks] Getting check attempts for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Checks] Error getting check attempts:', error);
        throw error;
      }

      console.log(`✅ [Checks] Found ${data.length} check attempts`);
      return data.map(this.mapToCheckAttempt);
    } catch (error) {
      console.error('❌ [Checks] Failed to get check attempts:', error);
      throw error;
    }
  }

  /**
   * Get all check attempts for a session
   */
  static async getCheckAttemptsBySession(sessionId: string): Promise<ChapterCheckAttempt[]> {
    try {
      console.log(`🔍 [Checks] Getting check attempts for session ${sessionId}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Checks] Error getting session check attempts:', error);
        throw error;
      }

      console.log(`✅ [Checks] Found ${data.length} check attempts for session`);
      return data.map(this.mapToCheckAttempt);
    } catch (error) {
      console.error('❌ [Checks] Failed to get session check attempts:', error);
      throw error;
    }
  }

  /**
   * Get all check attempts for a topic
   */
  static async getCheckAttemptsByTopic(topicId: string): Promise<ChapterCheckAttempt[]> {
    try {
      console.log(`🔍 [Checks] Getting check attempts for topic ${topicId}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Checks] Error getting topic check attempts:', error);
        throw error;
      }

      console.log(`✅ [Checks] Found ${data.length} check attempts for topic`);
      return data.map(this.mapToCheckAttempt);
    } catch (error) {
      console.error('❌ [Checks] Failed to get topic check attempts:', error);
      throw error;
    }
  }

  /**
   * Get the latest check attempt for a chapter
   */
  static async getLatestCheckAttempt(chapterId: string): Promise<ChapterCheckAttempt | null> {
    try {
      console.log(`🔍 [Checks] Getting latest check attempt for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ℹ️ [Checks] No check attempts found for chapter ${chapterId}`);
          return null;
        }
        throw error;
      }

      return this.mapToCheckAttempt(data);
    } catch (error) {
      console.error('❌ [Checks] Failed to get latest check attempt:', error);
      throw error;
    }
  }

  /**
   * Get check attempt by ID
   */
  static async getCheckAttemptById(attemptId: string): Promise<ChapterCheckAttempt | null> {
    try {
      console.log(`🔍 [Checks] Getting check attempt ${attemptId}`);
      
      const { data, error } = await supabase
        .from('checks_done')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ℹ️ [Checks] Check attempt not found: ${attemptId}`);
          return null;
        }
        throw error;
      }

      return this.mapToCheckAttempt(data);
    } catch (error) {
      console.error('❌ [Checks] Failed to get check attempt:', error);
      throw error;
    }
  }

  /**
   * Delete a check attempt
   */
  static async deleteCheckAttempt(attemptId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [Checks] Deleting check attempt ${attemptId}`);
      
      const { error } = await supabase
        .from('checks_done')
        .delete()
        .eq('id', attemptId);

      if (error) {
        console.error('❌ [Checks] Error deleting check attempt:', error);
        throw error;
      }

      console.log(`✅ [Checks] Deleted check attempt: ${attemptId}`);
      return true;
    } catch (error) {
      console.error('❌ [Checks] Failed to delete check attempt:', error);
      return false;
    }
  }

  /**
   * Get check statistics for a topic
   */
  static async getCheckStatsByTopic(topicId: string): Promise<{
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    completedChapters: string[];
  }> {
    try {
      const attempts = await this.getCheckAttemptsByTopic(topicId);
      
      if (attempts.length === 0) {
        return {
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0,
          completedChapters: []
        };
      }
      
      const scores = attempts.map(a => a.score);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const bestScore = Math.max(...scores);
      
      // Get unique chapters that have been assessed
      const completedChapters = [...new Set(attempts.map(a => a.chapterId))];
      
      return {
        totalAttempts: attempts.length,
        averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
        bestScore,
        completedChapters
      };
    } catch (error) {
      console.error('❌ [Checks] Failed to get check stats:', error);
      throw error;
    }
  }

  /**
   * Check if a chapter has been assessed (has any check attempts)
   */
  static async isChapterAssessed(chapterId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('checks_done')
        .select('id')
        .eq('chapter_id', chapterId)
        .limit(1);

      if (error) {
        console.error('❌ [Checks] Error checking if chapter is assessed:', error);
        throw error;
      }

      return data.length > 0;
    } catch (error) {
      console.error('❌ [Checks] Failed to check if chapter is assessed:', error);
      return false;
    }
  }

  /**
   * Map database row to ChapterCheckAttempt type
   */
  private static mapToCheckAttempt(data: ChecksDone): ChapterCheckAttempt {
    return {
      id: data.id,
      sessionId: data.session_id,
      topicId: data.topic_id,
      chapterId: data.chapter_id,
      questions: data.questions as ChapterCheckQuestion[],
      answers: data.answers as ChapterCheckAnswer[],
      aiFeedback: data.ai_feedback || undefined,
      score: data.score,
      model: data.model || undefined,
      durationSeconds: data.duration_seconds || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
