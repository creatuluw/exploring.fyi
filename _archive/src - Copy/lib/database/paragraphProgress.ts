/**
 * Paragraph Progress Service
 * Manages reading progress at the paragraph level for topics
 */

import { supabase } from './supabase.js';
import type { Database } from './supabase.js';

type ParagraphProgress = Database['public']['Tables']['paragraph_progress']['Row'];
type ParagraphProgressInsert = Database['public']['Tables']['paragraph_progress']['Insert'];
type ParagraphProgressUpdate = Database['public']['Tables']['paragraph_progress']['Update'];

export interface ParagraphProgressInfo {
  paragraphId: string;
  sectionId: string;
  isRead: boolean;
  readAt: string | null;
}

/**
 * Create a simple hash for paragraph content to detect changes
 */
function hashParagraphContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export class ParagraphProgressService {
  /**
   * Mark a paragraph as read
   */
  static async markAsRead(
    sessionId: string,
    topicId: string,
    sectionId: string,
    paragraphId: string,
    paragraphContent: string
  ): Promise<boolean> {
    try {
      const paragraphHash = hashParagraphContent(paragraphContent);
      
      const { error } = await supabase
        .from('paragraph_progress')
        .upsert({
          session_id: sessionId,
          topic_id: topicId,
          section_id: sectionId,
          paragraph_id: paragraphId,
          paragraph_hash: paragraphHash,
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,topic_id,section_id,paragraph_id'
        });

      if (error) {
        console.error('❌ [Paragraph Progress] Error marking paragraph as read:', error);
        return false;
      }

      console.log(`✅ [Paragraph Progress] Marked paragraph ${paragraphId} as read for topic ${topicId}`);
      return true;
    } catch (error) {
      console.error('❌ [Paragraph Progress] Unexpected error marking paragraph as read:', error);
      return false;
    }
  }

  /**
   * Mark a paragraph as unread
   */
  static async markAsUnread(
    sessionId: string,
    topicId: string,
    sectionId: string,
    paragraphId: string,
    paragraphContent: string
  ): Promise<boolean> {
    try {
      const paragraphHash = hashParagraphContent(paragraphContent);
      
      const { error } = await supabase
        .from('paragraph_progress')
        .upsert({
          session_id: sessionId,
          topic_id: topicId,
          section_id: sectionId,
          paragraph_id: paragraphId,
          paragraph_hash: paragraphHash,
          is_read: false,
          read_at: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,topic_id,section_id,paragraph_id'
        });

      if (error) {
        console.error('❌ [Paragraph Progress] Error marking paragraph as unread:', error);
        return false;
      }

      console.log(`✅ [Paragraph Progress] Marked paragraph ${paragraphId} as unread for topic ${topicId}`);
      return true;
    } catch (error) {
      console.error('❌ [Paragraph Progress] Unexpected error marking paragraph as unread:', error);
      return false;
    }
  }

  /**
   * Get reading progress for all paragraphs in a topic
   */
  static async getTopicProgress(
    sessionId: string,
    topicId: string
  ): Promise<ParagraphProgressInfo[]> {
    try {
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('section_id, paragraph_id, is_read, read_at')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .order('section_id')
        .order('paragraph_id');

      if (error) {
        console.error('❌ [Paragraph Progress] Error fetching topic progress:', error);
        return [];
      }

      return data.map(row => ({
        paragraphId: row.paragraph_id,
        sectionId: row.section_id,
        isRead: row.is_read,
        readAt: row.read_at
      }));
    } catch (error) {
      console.error('❌ [Paragraph Progress] Unexpected error fetching topic progress:', error);
      return [];
    }
  }

  /**
   * Get reading progress for a specific section
   */
  static async getSectionProgress(
    sessionId: string,
    topicId: string,
    sectionId: string
  ): Promise<ParagraphProgressInfo[]> {
    try {
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('paragraph_id, is_read, read_at')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .eq('section_id', sectionId)
        .order('paragraph_id');

      if (error) {
        console.error('❌ [Paragraph Progress] Error fetching section progress:', error);
        return [];
      }

      return data.map(row => ({
        paragraphId: row.paragraph_id,
        sectionId: sectionId,
        isRead: row.is_read,
        readAt: row.read_at
      }));
    } catch (error) {
      console.error('❌ [Paragraph Progress] Unexpected error fetching section progress:', error);
      return [];
    }
  }

  /**
   * Check if a specific paragraph is read
   */
  static async isParagraphRead(
    sessionId: string,
    topicId: string,
    sectionId: string,
    paragraphId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('is_read')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .eq('section_id', sectionId)
        .eq('paragraph_id', paragraphId)
        .maybeSingle();

      if (error) {
        console.error('❌ [Paragraph Progress] Error checking paragraph read status:', error);
        return false;
      }

      return data?.is_read || false;
    } catch (error) {
      console.error('❌ [Paragraph Progress] Unexpected error checking paragraph read status:', error);
      return false;
    }
  }

  /**
   * Get reading statistics for a topic
   */
  static async getTopicStats(
    sessionId: string,
    topicId: string
  ): Promise<{ totalParagraphs: number; readParagraphs: number; readPercentage: number }> {
    try {
      const progress = await this.getTopicProgress(sessionId, topicId);
      const totalParagraphs = progress.length;
      const readParagraphs = progress.filter(p => p.isRead).length;
      const readPercentage = totalParagraphs > 0 ? Math.round((readParagraphs / totalParagraphs) * 100) : 0;

      return {
        totalParagraphs,
        readParagraphs,
        readPercentage
      };
    } catch (error) {
      console.error('❌ [Paragraph Progress] Error calculating topic stats:', error);
      return { totalParagraphs: 0, readParagraphs: 0, readPercentage: 0 };
    }
  }
}

