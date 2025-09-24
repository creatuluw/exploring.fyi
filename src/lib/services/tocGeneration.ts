/**
 * Table of Contents (ToC) Generation Service
 * Implements ToC-first generation per app-flow.md specifications
 */

import { browser } from '$app/environment';
import { z } from 'zod';
import { ChaptersService } from '$lib/database/chapters.js';
import { ParagraphsService } from '$lib/database/paragraphs.js';
import { supabase, type Database } from '$lib/database/supabase.js';
import type { ChapterRecord, ChapterWithParagraphs } from '$lib/types/index.js';
import type { SupportedLanguage } from '$lib/types/language.js';
import { MAX_CHAPTERS_GENERATED, AI_MODEL_TEMPERATURE, AI_MAX_OUTPUT_TOKENS } from '$lib/settings';

type TocRow = Database['public']['Tables']['toc']['Row'];
type TocInsert = Database['public']['Tables']['toc']['Insert'];

// ToC generation schema
const TocSchema = z.object({
  topic: z.string(),
  description: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedTimeMinutes: z.number(),
  chapters: z.array(z.object({
    title: z.string(),
    description: z.string(),
    paragraphCount: z.number().min(2).max(8), // 2-8 paragraphs per chapter
    paragraphSummaries: z.array(z.string()).optional() // Optional paragraph previews
  }))
});

export type TocGeneration = z.infer<typeof TocSchema>;

export interface TocGenerationOptions {
  language?: SupportedLanguage;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  maxChapters?: number;
  context?: string;
  nodeDescription?: string; // From mind map node expansion
}

export class TocGenerationService {
  /**
   * Generate ToC for a topic and persist to database
   */
  static async generateAndPersistToc(
    topicId: string,
    topic: string,
    options: TocGenerationOptions = {}
  ): Promise<ChapterWithParagraphs[]> {
    // Prevent running on client side
    if (browser) {
      throw new Error('TocGenerationService.generateAndPersistToc can only be called on the server side. Use API endpoints from client code.');
    }
    
    try {
      console.log(`📚 [ToC] Generating ToC for topic: "${topic}"`);
      
      // Check if ToC already exists
      const existingChapters = await ChaptersService.getChaptersByTopic(topicId);
      if (existingChapters.length > 0) {
        console.log(`ℹ️ [ToC] ToC already exists for topic ${topicId}, loading existing`);
        return await ChaptersService.getChaptersWithParagraphs(topicId);
      }

      // Generate ToC with AI
      const tocData = await this.generateToc(topic, options);
      
      // Persist chapters to database
      const chapters = await this.persistTocToDatabase(topicId, tocData);
      
      console.log(`✅ [ToC] Generated and persisted ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      console.error('❌ [ToC] Failed to generate and persist ToC:', error);
      throw error;
    }
  }

  /**
   * Generate ToC using AI (without database persistence)
   */
  static async generateToc(
    topic: string,
    options: TocGenerationOptions = {}
  ): Promise<TocGeneration> {
    // Prevent running on client side
    if (browser) {
      throw new Error('TocGenerationService.generateToc can only be called on the server side. Use API endpoints from client code.');
    }
    
    try {
      // Dynamic import for server-only dependencies
      const { generate } = await import('@genkit-ai/ai');
      const { googleAI } = await import('@genkit-ai/google-genai');
      const { getTopicAnalysisPrompt } = await import('./aiPrompts.js');
      const {
        language = 'en',
        difficulty = 'intermediate',
        maxChapters = MAX_CHAPTERS_GENERATED,
        context,
        nodeDescription
      } = options;

      console.log(`🤖 [ToC] Generating AI ToC for: "${topic}" (${difficulty})`);

      // Build enhanced prompt with context
      let promptContext = `Topic: ${topic}`;
      if (context) {
        promptContext += `\nContext: ${context}`;
      }
      if (nodeDescription) {
        promptContext += `\nNode Description: ${nodeDescription}`;
      }

      const prompt = this.buildTocPrompt(promptContext, difficulty, maxChapters, language, getTopicAnalysisPrompt);

      const response = await generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt,
        output: {
          schema: TocSchema,
        },
        config: {
          temperature: AI_MODEL_TEMPERATURE,
          maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        }
      });

      const tocData = response.output;
      console.log(`✅ [ToC] Generated ToC with ${tocData.chapters.length} chapters`);
      
      return tocData;
    } catch (error) {
      console.error('❌ [ToC] Failed to generate ToC:', error);
      throw error;
    }
  }

  /**
   * Store ToC metadata in the toc table
   */
  static async storeTocMetadata(
    topicId: string,
    sessionId: string,
    tocData: TocGeneration,
    options: TocGenerationOptions = {}
  ): Promise<TocRow> {
    try {
      console.log(`💾 [ToC] Storing ToC metadata for topic ${topicId}`);

      const totalParagraphs = tocData.chapters.reduce((sum, ch) => sum + ch.paragraphCount, 0);

      const tocInsert: TocInsert = {
        id: topicId, // Use slug as simple ID
        topic_id: topicId, // Same as ID for consistency
        session_id: sessionId,
        title: tocData.topic,
        description: tocData.description,
        difficulty: tocData.difficulty,
        estimated_time_minutes: tocData.estimatedTimeMinutes,
        total_chapters: tocData.chapters.length,
        total_paragraphs: totalParagraphs,
        ai_model: 'gemini-2.5-flash',
        generation_options: options || null,
        metadata: {
          generatedAt: new Date().toISOString(),
          chapterTitles: tocData.chapters.map(ch => ch.title)
        }
      };

      const { data, error } = await supabase
        .from('toc')
        .insert(tocInsert)
        .select()
        .single();

      if (error) {
        console.error('❌ [ToC] Error storing ToC metadata:', error);
        throw error;
      }

      console.log(`✅ [ToC] Stored ToC metadata: ${data.id}`);
      return data;
    } catch (error) {
      console.error('❌ [ToC] Failed to store ToC metadata:', error);
      throw error;
    }
  }

  /**
   * Persist generated ToC to database with paragraph stubs
   */
  static async persistTocToDatabase(
    topicId: string,
    sessionId: string,
    tocData: TocGeneration,
    options: TocGenerationOptions = {}
  ): Promise<ChapterWithParagraphs[]> {
    try {
      console.log(`💾 [ToC] Persisting ToC to database for topic ${topicId}`);

      // First, store the ToC metadata
      await this.storeTocMetadata(topicId, sessionId, tocData, options);

      // Create chapters with metadata
      const chapterData = tocData.chapters.map((chapter, index) => ({
        index: index + 1, // 1-based indexing
        title: chapter.title,
        description: chapter.description,
        metadata: {
          difficulty: tocData.difficulty,
          estimatedTimeMinutes: Math.round(tocData.estimatedTimeMinutes / tocData.chapters.length),
          paragraphCount: chapter.paragraphCount,
          paragraphSummaries: chapter.paragraphSummaries || []
        }
      }));

      // Create chapters in database
      const chapters = await ChaptersService.createChapters(topicId, sessionId, chapterData);
      
      // Create paragraph stubs for each chapter
      const chaptersWithParagraphs: ChapterWithParagraphs[] = [];
      
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterTocData = tocData.chapters[i];
        
        // Create paragraph stubs (without content)
        const paragraphs = await ParagraphsService.createParagraphStubs(
          topicId,
          chapter.id,
          sessionId,
          chapterTocData.paragraphCount,
          chapterTocData.paragraphSummaries
        );
        
        chaptersWithParagraphs.push({
          ...chapter,
          paragraphs
        });
      }

      console.log(`✅ [ToC] Persisted ${chapters.length} chapters with paragraph stubs`);
      return chaptersWithParagraphs;
    } catch (error) {
      console.error('❌ [ToC] Failed to persist ToC to database:', error);
      throw error;
    }
  }

  /**
   * Get existing ToC metadata from the toc table
   */
  static async getTocMetadata(topicId: string): Promise<TocRow | null> {
    try {
      console.log(`🔍 [ToC] Getting ToC metadata for topic: ${topicId}`);
      
      const { data, error } = await supabase
        .from('toc')
        .select('*')
        .eq('id', topicId)
        .maybeSingle();

      if (error) {
        console.error('❌ [ToC] Error getting ToC metadata:', error);
        return null;
      }

      if (data) {
        console.log(`✅ [ToC] Found ToC metadata for topic: ${topicId}`);
      } else {
        console.log(`ℹ️ [ToC] No ToC metadata found for topic: ${topicId}`);
      }

      return data;
    } catch (error) {
      console.error('❌ [ToC] Failed to get ToC metadata:', error);
      return null;
    }
  }

  /**
   * Get existing ToC for a topic
   */
  static async getExistingToc(topicId: string): Promise<ChapterWithParagraphs[] | null> {
    try {
      console.log(`🔍 [ToC] Getting existing ToC for topic: ${topicId}`);
      
      // First check if ToC metadata exists
      const tocMetadata = await this.getTocMetadata(topicId);
      if (!tocMetadata) {
        console.log(`ℹ️ [ToC] No ToC metadata found for topic: ${topicId}`);
        return null;
      }
      
      // Get chapters and paragraphs
      const chapters = await ChaptersService.getChaptersByTopic(topicId);
      if (chapters.length === 0) {
        console.log(`ℹ️ [ToC] No existing chapters found for topic: ${topicId}`);
        return null;
      }
      
      console.log(`✅ [ToC] Found ${chapters.length} existing chapters for topic: ${topicId}`);
      return await ChaptersService.getChaptersWithParagraphs(topicId);
    } catch (error) {
      console.error('❌ [ToC] Failed to get existing ToC:', error);
      return null;
    }
  }

  /**
   * Get ToC generation progress for a topic
   */
  static async getTocProgress(topicId: string): Promise<{
    hasToC: boolean;
    totalChapters: number;
    totalParagraphs: number;
    generatedParagraphs: number;
    completionPercentage: number;
  }> {
    try {
      const chapters = await ChaptersService.getChaptersByTopic(topicId);
      
      if (chapters.length === 0) {
        return {
          hasToC: false,
          totalChapters: 0,
          totalParagraphs: 0,
          generatedParagraphs: 0,
          completionPercentage: 0
        };
      }

      const stats = await ChaptersService.getChapterStats(topicId);
      
      return {
        hasToC: true,
        totalChapters: stats.totalChapters,
        totalParagraphs: stats.totalParagraphs,
        generatedParagraphs: stats.generatedParagraphs,
        completionPercentage: stats.totalParagraphs > 0 
          ? Math.round((stats.generatedParagraphs / stats.totalParagraphs) * 100)
          : 0
      };
    } catch (error) {
      console.error('❌ [ToC] Failed to get ToC progress:', error);
      throw error;
    }
  }

  /**
   * Regenerate ToC (delete existing and create new)
   */
  static async regenerateToc(
    topicId: string,
    topic: string,
    options: TocGenerationOptions = {}
  ): Promise<ChapterWithParagraphs[]> {
    // Prevent running on client side
    if (browser) {
      throw new Error('TocGenerationService.regenerateToc can only be called on the server side. Use API endpoints from client code.');
    }
    
    try {
      console.log(`🔄 [ToC] Regenerating ToC for topic: "${topic}"`);
      
      // Delete existing chapters (cascade will delete paragraphs)
      await ChaptersService.deleteChaptersByTopic(topicId);
      
      // Generate new ToC
      return await this.generateAndPersistToc(topicId, topic, options);
    } catch (error) {
      console.error('❌ [ToC] Failed to regenerate ToC:', error);
      throw error;
    }
  }


  /**
   * Build ToC generation prompt
   */
  private static buildTocPrompt(
    topic: string,
    difficulty: string,
    maxChapters: number,
    language: SupportedLanguage,
    getTopicAnalysisPromptFn?: Function
  ): string {
    const basePrompt = getTopicAnalysisPromptFn ? getTopicAnalysisPromptFn(topic, language) : `Analyze the topic: ${topic}`;
    
    return `${basePrompt}

Create a comprehensive Table of Contents for learning "${topic}" at ${difficulty} level.

Requirements:
- Generate ${maxChapters} or fewer chapters that logically progress from basic concepts to advanced applications
- Each chapter should have 2-8 paragraphs
- Provide clear chapter titles and descriptions
- Include paragraph summaries that preview what each paragraph will cover
- Ensure the content flows logically and builds knowledge progressively
- Estimate total learning time based on content depth

The ToC should follow this learning progression:
1. Introduction and fundamental concepts
2. Core principles and theory
3. Practical applications and examples
4. Advanced concepts and edge cases
5. Real-world implementation
6. Summary and next steps

Focus on creating a ToC that enables sequential paragraph generation where users can request "Explain next paragraph" to get detailed content on-demand.`;
  }
}

/**
 * Streaming ToC generation for real-time UI updates
 */
export interface TocStreamingCallback {
  onChapter?: (chapter: { title: string; description: string }, index: number) => void;
  onComplete?: (toc: TocGeneration) => void;
  onError?: (error: string) => void;
}

export class StreamingTocService {
  /**
   * Generate ToC with streaming updates (for UI)
   */
  static async generateTocStreaming(
    topic: string,
    callback: TocStreamingCallback,
    options: TocGenerationOptions = {}
  ): Promise<TocGeneration> {
    try {
      // For now, generate complete ToC and simulate streaming
      // TODO: Implement actual streaming when Genkit supports it
      const tocData = await TocGenerationService.generateToc(topic, options);
      
      // Simulate streaming by emitting chapters progressively
      for (let i = 0; i < tocData.chapters.length; i++) {
        const chapter = tocData.chapters[i];
        callback.onChapter?.(
          { title: chapter.title, description: chapter.description },
          i
        );
        
        // Add small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      callback.onComplete?.(tocData);
      return tocData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callback.onError?.(errorMessage);
      throw error;
    }
  }
}
