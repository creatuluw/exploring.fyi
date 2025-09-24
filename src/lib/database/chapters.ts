/**
 * Chapters Service
 * Handles chapter data storage and retrieval for the ToC system
 */

import { supabase, type Database, dbHelpers } from './supabase.js';
import type { ChapterRecord, ChapterWithParagraphs } from '$lib/types/index.js';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterInsert = Database['public']['Tables']['chapters']['Insert'];
type ChapterUpdate = Database['public']['Tables']['chapters']['Update'];

export class ChaptersService {
  /**
   * Create a new chapter for a topic
   */
  static async createChapter(
    topicId: string,
    sessionId: string,
    index: number,
    title: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<ChapterRecord> {
    try {
      console.log(`📝 [Chapters] Creating chapter ${index}: "${title}" for topic ${topicId}`);
      
      const chapterId = dbHelpers.generateChapterId(topicId, index);
      
      const { data, error } = await supabase
        .from('chapters')
        .insert({
          id: chapterId,
          topic_id: topicId,
          session_id: sessionId,
          index,
          title,
          description,
          metadata
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Chapters] Error creating chapter:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Created chapter: ${data.id}`);
      return this.mapToChapterRecord(data);
    } catch (error) {
      console.error('❌ [Chapters] Failed to create chapter:', error);
      throw error;
    }
  }

  /**
   * Create multiple chapters for a topic (ToC generation)
   */
  static async createChapters(
    topicId: string,
    sessionId: string,
    chapters: Array<{
      index: number;
      title: string;
      description?: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<ChapterRecord[]> {
    try {
      console.log(`📝 [Chapters] Creating ${chapters.length} chapters for topic ${topicId}`);
      
      const insertData = chapters.map(chapter => ({
        id: dbHelpers.generateChapterId(topicId, chapter.index),
        topic_id: topicId,
        session_id: sessionId,
        index: chapter.index,
        title: chapter.title,
        description: chapter.description,
        metadata: chapter.metadata
      }));

      const { data, error } = await supabase
        .from('chapters')
        .insert(insertData)
        .select()
        .order('index');

      if (error) {
        console.error('❌ [Chapters] Error creating chapters:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Created ${data.length} chapters`);
      return data.map(this.mapToChapterRecord);
    } catch (error) {
      console.error('❌ [Chapters] Failed to create chapters:', error);
      throw error;
    }
  }

  /**
   * Get all chapters for a topic, ordered by index
   */
  static async getChaptersByTopic(topicId: string): Promise<ChapterRecord[]> {
    try {
      console.log(`🔍 [Chapters] Getting chapters for topic ${topicId}`);
      
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('topic_id', topicId)
        .order('index');

      if (error) {
        console.error('❌ [Chapters] Error getting chapters:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Found ${data.length} chapters`);
      return data.map(this.mapToChapterRecord);
    } catch (error) {
      console.error('❌ [Chapters] Failed to get chapters:', error);
      throw error;
    }
  }

  /**
   * Get chapters with their paragraphs
   */
  static async getChaptersWithParagraphs(topicId: string): Promise<ChapterWithParagraphs[]> {
    try {
      console.log(`🔍 [Chapters] Getting chapters with paragraphs for topic ${topicId}`);
      
      // Get chapters
      const chapters = await this.getChaptersByTopic(topicId);
      
      // Get paragraphs for all chapters
      const { ParagraphsService } = await import('./paragraphs.js');
      const chaptersWithParagraphs: ChapterWithParagraphs[] = [];
      
      for (const chapter of chapters) {
        const paragraphs = await ParagraphsService.getParagraphsByChapter(chapter.id);
        chaptersWithParagraphs.push({
          ...chapter,
          paragraphs
        });
      }

      console.log(`✅ [Chapters] Retrieved ${chaptersWithParagraphs.length} chapters with paragraphs`);
      return chaptersWithParagraphs;
    } catch (error) {
      console.error('❌ [Chapters] Failed to get chapters with paragraphs:', error);
      throw error;
    }
  }

  /**
   * Get a single chapter by ID
   */
  static async getChapterById(chapterId: string): Promise<ChapterRecord | null> {
    try {
      console.log(`🔍 [Chapters] Getting chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`ℹ️ [Chapters] Chapter not found: ${chapterId}`);
          return null;
        }
        throw error;
      }

      return this.mapToChapterRecord(data);
    } catch (error) {
      console.error('❌ [Chapters] Failed to get chapter:', error);
      throw error;
    }
  }

  /**
   * Update chapter metadata or description
   */
  static async updateChapter(
    chapterId: string,
    updates: {
      title?: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<ChapterRecord | null> {
    try {
      console.log(`📝 [Chapters] Updating chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('chapters')
        .update(updates)
        .eq('id', chapterId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Chapters] Error updating chapter:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Updated chapter: ${data.id}`);
      return this.mapToChapterRecord(data);
    } catch (error) {
      console.error('❌ [Chapters] Failed to update chapter:', error);
      throw error;
    }
  }

  /**
   * Delete a chapter and all its paragraphs
   */
  static async deleteChapter(chapterId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [Chapters] Deleting chapter ${chapterId}`);
      
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) {
        console.error('❌ [Chapters] Error deleting chapter:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Deleted chapter: ${chapterId}`);
      return true;
    } catch (error) {
      console.error('❌ [Chapters] Failed to delete chapter:', error);
      return false;
    }
  }

  /**
   * Delete all chapters for a topic
   */
  static async deleteChaptersByTopic(topicId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [Chapters] Deleting all chapters for topic ${topicId}`);
      
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('topic_id', topicId);

      if (error) {
        console.error('❌ [Chapters] Error deleting chapters:', error);
        throw error;
      }

      console.log(`✅ [Chapters] Deleted chapters for topic: ${topicId}`);
      return true;
    } catch (error) {
      console.error('❌ [Chapters] Failed to delete chapters:', error);
      return false;
    }
  }

  /**
   * Get chapter statistics for a topic
   */
  static async getChapterStats(topicId: string): Promise<{
    totalChapters: number;
    chaptersWithParagraphs: number;
    totalParagraphs: number;
    generatedParagraphs: number;
  }> {
    try {
      const chapters = await this.getChaptersByTopic(topicId);
      const { ParagraphsService } = await import('./paragraphs.js');
      
      let chaptersWithParagraphs = 0;
      let totalParagraphs = 0;
      let generatedParagraphs = 0;
      
      for (const chapter of chapters) {
        const paragraphs = await ParagraphsService.getParagraphsByChapter(chapter.id);
        if (paragraphs.length > 0) {
          chaptersWithParagraphs++;
        }
        totalParagraphs += paragraphs.length;
        generatedParagraphs += paragraphs.filter(p => p.isGenerated).length;
      }
      
      return {
        totalChapters: chapters.length,
        chaptersWithParagraphs,
        totalParagraphs,
        generatedParagraphs
      };
    } catch (error) {
      console.error('❌ [Chapters] Failed to get chapter stats:', error);
      throw error;
    }
  }

  /**
   * Map database row to ChapterRecord type
   */
  private static mapToChapterRecord(data: Chapter): ChapterRecord {
    return {
      id: data.id,
      topicId: data.topic_id,
      sessionId: data.session_id,
      index: data.index,
      title: data.title,
      description: data.description || undefined,
      metadata: data.metadata || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
