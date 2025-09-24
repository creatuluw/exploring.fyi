/**
 * Paragraphs Service
 * Handles paragraph data storage and on-demand content generation
 */

import { supabase, type Database, dbHelpers } from './supabase.js';
import type { ParagraphRecord } from '$lib/types/index.js';

type Paragraph = Database['public']['Tables']['paragraphs']['Row'];
type ParagraphInsert = Database['public']['Tables']['paragraphs']['Insert'];
type ParagraphUpdate = Database['public']['Tables']['paragraphs']['Update'];

export class ParagraphsService {
  /**
   * Create paragraph stubs for a chapter (without content)
   */
  static async createParagraphStubs(
    topicId: string,
    chapterId: string,
    sessionId: string,
    count: number,
    summaries?: string[]
  ): Promise<ParagraphRecord[]> {
    try {
      console.log(`📝 [Paragraphs] Creating ${count} paragraph stubs for chapter ${chapterId}`);
      
      const insertData: ParagraphInsert[] = Array.from({ length: count }, (_, i) => ({
        id: dbHelpers.generateParagraphId(chapterId, i + 1),
        topic_id: topicId,
        chapter_id: chapterId,
        session_id: sessionId,
        index: i + 1, // 1-based indexing
        summary: summaries?.[i] || undefined,
        is_generated: false
      }));

      const { data, error } = await supabase
        .from('paragraphs')
        .insert(insertData)
        .select()
        .order('index');

      if (error) {
        console.error('❌ [Paragraphs] Error creating paragraph stubs:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Created ${data.length} paragraph stubs`);
      return data.map(this.mapToParagraphRecord);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to create paragraph stubs:', error);
      throw error;
    }
  }

  /**
   * Generate content for a specific paragraph
   */
  static async generateParagraphContent(
    paragraphId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<ParagraphRecord | null> {
    try {
      console.log(`🤖 [Paragraphs] Generating content for paragraph ${paragraphId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .update({
          content,
          metadata,
          is_generated: true,
          generated_at: new Date().toISOString()
        })
        .eq('id', paragraphId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Paragraphs] Error generating paragraph content:', error);
        throw new Error(`Database error generating paragraph content: ${error.message || JSON.stringify(error)}`);
      }

      console.log(`✅ [Paragraphs] Generated content for paragraph: ${data.id}`);
      return this.mapToParagraphRecord(data);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to generate paragraph content:', error);
      // Re-throw as proper Error if it's not already one
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to generate paragraph content: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * Get all paragraphs for a chapter, ordered by index
   */
  static async getParagraphsByChapter(chapterId: string): Promise<ParagraphRecord[]> {
    try {
      console.log(`🔍 [Paragraphs] Getting paragraphs for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('index');

      if (error) {
        console.error('❌ [Paragraphs] Error getting paragraphs:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Found ${data.length} paragraphs`);
      return data.map(this.mapToParagraphRecord);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get paragraphs:', error);
      throw error;
    }
  }

  /**
   * Get all paragraphs for a topic
   */
  static async getParagraphsByTopic(topicId: string): Promise<ParagraphRecord[]> {
    try {
      console.log(`🔍 [Paragraphs] Getting paragraphs for topic ${topicId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('topic_id', topicId)
        .order('chapter_id, index');

      if (error) {
        console.error('❌ [Paragraphs] Error getting paragraphs by topic:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Found ${data.length} paragraphs for topic`);
      return data.map(this.mapToParagraphRecord);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get paragraphs by topic:', error);
      throw error;
    }
  }

  /**
   * Get a single paragraph by ID
   */
  static async getParagraphById(paragraphId: string): Promise<ParagraphRecord | null> {
    try {
      console.log(`🔍 [Paragraphs] Getting paragraph ${paragraphId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('id', paragraphId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ℹ️ [Paragraphs] Paragraph not found: ${paragraphId}`);
          return null;
        }
        console.error('❌ [Paragraphs] Supabase error:', error);
        throw new Error(`Database error: ${error.message || JSON.stringify(error)}`);
      }

      return this.mapToParagraphRecord(data);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get paragraph:', error);
      // Re-throw as proper Error if it's not already one
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to get paragraph: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * Get the next ungenerated paragraph in a chapter
   */
  static async getNextUngeneratedParagraph(chapterId: string): Promise<ParagraphRecord | null> {
    try {
      console.log(`🔍 [Paragraphs] Getting next ungenerated paragraph for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_generated', false)
        .order('index')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ℹ️ [Paragraphs] No ungenerated paragraphs found in chapter ${chapterId}`);
          return null;
        }
        throw error;
      }

      return this.mapToParagraphRecord(data);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get next ungenerated paragraph:', error);
      throw error;
    }
  }

  /**
   * Check if all paragraphs in a chapter are generated
   */
  static async isChapterComplete(chapterId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('paragraphs')
        .select('is_generated')
        .eq('chapter_id', chapterId);

      if (error) {
        console.error('❌ [Paragraphs] Error checking chapter completion:', error);
        throw error;
      }

      const allGenerated = data.every(p => p.is_generated);
      console.log(`✅ [Paragraphs] Chapter ${chapterId} completion: ${allGenerated}`);
      return allGenerated;
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to check chapter completion:', error);
      return false;
    }
  }

  /**
   * Update paragraph content and metadata
   */
  static async updateParagraph(
    paragraphId: string,
    updates: {
      content?: string;
      summary?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<ParagraphRecord | null> {
    try {
      console.log(`📝 [Paragraphs] Updating paragraph ${paragraphId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .update(updates)
        .eq('id', paragraphId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Paragraphs] Error updating paragraph:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Updated paragraph: ${data.id}`);
      return this.mapToParagraphRecord(data);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to update paragraph:', error);
      throw error;
    }
  }

  /**
   * Delete a paragraph
   */
  static async deleteParagraph(paragraphId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [Paragraphs] Deleting paragraph ${paragraphId}`);
      
      const { error } = await supabase
        .from('paragraphs')
        .delete()
        .eq('id', paragraphId);

      if (error) {
        console.error('❌ [Paragraphs] Error deleting paragraph:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Deleted paragraph: ${paragraphId}`);
      return true;
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to delete paragraph:', error);
      return false;
    }
  }

  /**
   * Delete all paragraphs for a chapter
   */
  static async deleteParagraphsByChapter(chapterId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [Paragraphs] Deleting all paragraphs for chapter ${chapterId}`);
      
      const { error } = await supabase
        .from('paragraphs')
        .delete()
        .eq('chapter_id', chapterId);

      if (error) {
        console.error('❌ [Paragraphs] Error deleting paragraphs:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Deleted paragraphs for chapter: ${chapterId}`);
      return true;
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to delete paragraphs:', error);
      return false;
    }
  }

  /**
   * Get paragraph statistics for a chapter
   */
  static async getParagraphStats(chapterId: string): Promise<{
    totalParagraphs: number;
    generatedParagraphs: number;
    completionPercentage: number;
  }> {
    try {
      const paragraphs = await this.getParagraphsByChapter(chapterId);
      const generatedCount = paragraphs.filter(p => p.isGenerated).length;
      const totalCount = paragraphs.length;
      
      return {
        totalParagraphs: totalCount,
        generatedParagraphs: generatedCount,
        completionPercentage: totalCount > 0 ? Math.round((generatedCount / totalCount) * 100) : 0
      };
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get paragraph stats:', error);
      throw error;
    }
  }

  /**
   * Get all generated paragraphs for a topic (for content export)
   */
  static async getGeneratedParagraphsByTopic(topicId: string): Promise<ParagraphRecord[]> {
    try {
      console.log(`🔍 [Paragraphs] Getting generated paragraphs for topic ${topicId}`);
      
      const { data, error } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_generated', true)
        .order('chapter_id, index');

      if (error) {
        console.error('❌ [Paragraphs] Error getting generated paragraphs:', error);
        throw error;
      }

      console.log(`✅ [Paragraphs] Found ${data.length} generated paragraphs`);
      return data.map(this.mapToParagraphRecord);
    } catch (error) {
      console.error('❌ [Paragraphs] Failed to get generated paragraphs:', error);
      throw error;
    }
  }

  /**
   * Map database row to ParagraphRecord type
   */
  private static mapToParagraphRecord(data: Paragraph): ParagraphRecord {
    return {
      id: data.id,
      topicId: data.topic_id,
      chapterId: data.chapter_id,
      index: data.index,
      content: data.content || undefined,
      summary: data.summary || undefined,
      metadata: data.metadata || undefined,
      isGenerated: data.is_generated,
      generatedAt: data.generated_at || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
