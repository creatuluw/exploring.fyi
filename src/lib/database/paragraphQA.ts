/**
 * Paragraph Q&A Service
 * Manages questions and answers for individual paragraphs
 */

import { supabase } from './supabase.js';
import type { Database } from './supabase.js';

type ParagraphQA = Database['public']['Tables']['paragraph_qa']['Row'];
type ParagraphQAInsert = Database['public']['Tables']['paragraph_qa']['Insert'];

export interface QuestionAnswer {
  id: string;
  question: string;
  answer: string;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
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

export class ParagraphQAService {
  /**
   * Save a Q&A pair for a paragraph
   */
  static async saveQA(
    sessionId: string,
    topicId: string,
    sectionId: string,
    paragraphId: string,
    paragraphContent: string,
    question: string,
    answer: string,
    aiModel: string = 'gemini-2.5-flash'
  ): Promise<string | null> {
    try {
      const paragraphHash = hashParagraphContent(paragraphContent);
      
      const { data, error } = await supabase
        .from('paragraph_qa')
        .insert({
          session_id: sessionId,
          topic_id: topicId,
          section_id: sectionId,
          paragraph_id: paragraphId,
          paragraph_hash: paragraphHash,
          question,
          answer,
          ai_model: aiModel,
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [Paragraph Q&A] Error saving Q&A:', error);
        return null;
      }

      console.log(`✅ [Paragraph Q&A] Saved Q&A for paragraph ${paragraphId} in topic ${topicId}`);
      return data.id;
    } catch (error) {
      console.error('❌ [Paragraph Q&A] Unexpected error saving Q&A:', error);
      return null;
    }
  }

  /**
   * Get all Q&A pairs for a specific paragraph
   */
  static async getParagraphQAs(
    sessionId: string,
    topicId: string,
    sectionId: string,
    paragraphId: string
  ): Promise<QuestionAnswer[]> {
    try {
      const { data, error } = await supabase
        .from('paragraph_qa')
        .select('id, question, answer, ai_model, created_at, updated_at')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .eq('section_id', sectionId)
        .eq('paragraph_id', paragraphId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Paragraph Q&A] Error fetching paragraph Q&As:', error);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        aiModel: row.ai_model,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('❌ [Paragraph Q&A] Unexpected error fetching paragraph Q&As:', error);
      return [];
    }
  }

  /**
   * Get all Q&A pairs for a topic
   */
  static async getTopicQAs(
    sessionId: string,
    topicId: string
  ): Promise<(QuestionAnswer & { sectionId: string; paragraphId: string })[]> {
    try {
      const { data, error } = await supabase
        .from('paragraph_qa')
        .select('id, section_id, paragraph_id, question, answer, ai_model, created_at, updated_at')
        .eq('session_id', sessionId)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Paragraph Q&A] Error fetching topic Q&As:', error);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        sectionId: row.section_id,
        paragraphId: row.paragraph_id,
        question: row.question,
        answer: row.answer,
        aiModel: row.ai_model,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('❌ [Paragraph Q&A] Unexpected error fetching topic Q&As:', error);
      return [];
    }
  }

  /**
   * Delete a Q&A pair
   */
  static async deleteQA(
    sessionId: string,
    qaId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('paragraph_qa')
        .delete()
        .eq('id', qaId)
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ [Paragraph Q&A] Error deleting Q&A:', error);
        return false;
      }

      console.log(`✅ [Paragraph Q&A] Deleted Q&A ${qaId}`);
      return true;
    } catch (error) {
      console.error('❌ [Paragraph Q&A] Unexpected error deleting Q&A:', error);
      return false;
    }
  }

  /**
   * Get Q&A statistics for a topic
   */
  static async getTopicQAStats(
    sessionId: string,
    topicId: string
  ): Promise<{ totalQAs: number; paragraphsWithQAs: number }> {
    try {
      const qas = await this.getTopicQAs(sessionId, topicId);
      const uniqueParagraphs = new Set(qas.map(qa => `${qa.sectionId}-${qa.paragraphId}`));
      
      return {
        totalQAs: qas.length,
        paragraphsWithQAs: uniqueParagraphs.size
      };
    } catch (error) {
      console.error('❌ [Paragraph Q&A] Error calculating topic Q&A stats:', error);
      return { totalQAs: 0, paragraphsWithQAs: 0 };
    }
  }
}

