/**
 * Generate Paragraph API
 * On-demand paragraph content generation endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParagraphsService } from '$lib/database/paragraphs.js';
import { ChaptersService } from '$lib/database/chapters.js';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { GEMINI_API_KEY } from '$env/static/private';
import { MAX_WORDS_PER_PARAGRAPH, AI_MODEL_TEMPERATURE, AI_MAX_OUTPUT_TOKENS } from '$lib/settings';

// Initialize Genkit
const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
});
import { z } from 'zod';
import { getContentGenerationPrompt } from '$lib/services/aiPrompts.js';
import type { SupportedLanguage } from '$lib/types/language.js';

// Paragraph generation schema
const ParagraphSchema = z.object({
  content: z.string(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  metadata: z.object({
    wordCount: z.number(),
    readingTimeMinutes: z.number(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    concepts: z.array(z.string()).optional()
  }).optional()
});

export type ParagraphGeneration = z.infer<typeof ParagraphSchema>;

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📝 [API] Paragraph generation request received');
    
    const body = await request.json();
    const { 
      paragraphId,
      topicTitle,
      chapterTitle,
      paragraphIndex,
      paragraphSummary,
      options = {}
    } = body;

    // Validate required fields
    if (!paragraphId || !topicTitle || !chapterTitle || paragraphIndex === undefined) {
      return json(
        { error: 'Missing required fields: paragraphId, topicTitle, chapterTitle, paragraphIndex' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] Generating paragraph ${paragraphIndex} for chapter: "${chapterTitle}"`);

    try {
      // Get paragraph details
      let paragraph = await ParagraphsService.getParagraphById(paragraphId);
      
      // If paragraph doesn't exist in database, this might be from a ToC that wasn't persisted
      // Create a paragraph stub based on the provided information
      if (!paragraph) {
        console.log(`⚠️ [API] Paragraph not found in database, creating stub for: ${paragraphId}`);
        
        // We need to ensure we have the necessary information to create the paragraph
        if (!topicTitle || !chapterTitle || paragraphIndex === undefined) {
          return json(
            { error: 'Paragraph not found and insufficient information to create stub' },
            { status: 404 }
          );
        }
        
        // For now, we'll generate content without creating a database stub
        // This handles the case where ToC data is mock but we still want to generate content
        console.log(`🔄 [API] Proceeding with content generation for non-persisted paragraph`);
      }

      // Check if already generated (only if paragraph exists in database)
      if (paragraph && paragraph.isGenerated && paragraph.content) {
        console.log(`ℹ️ [API] Paragraph already generated, returning existing content`);
        return json({
          success: true,
          data: {
            paragraphId,
            content: paragraph.content,
            summary: paragraph.summary,
            metadata: paragraph.metadata,
            isExisting: true
          }
        });
      }

      // Generate paragraph content with AI
      const generatedParagraph = await generateParagraphContent(
        topicTitle,
        chapterTitle,
        paragraphIndex,
        paragraphSummary,
        options
      );

      // Save generated content to database if paragraph exists, otherwise return content directly
      if (paragraph) {
        // Paragraph exists in database, update it
        const updatedParagraph = await ParagraphsService.generateParagraphContent(
          paragraphId,
          generatedParagraph.content,
          {
            ...generatedParagraph.metadata,
            summary: generatedParagraph.summary,
            keyPoints: generatedParagraph.keyPoints,
            examples: generatedParagraph.examples,
            generatedAt: new Date().toISOString(),
            model: 'gemini-1.5-flash'
          }
        );

        if (!updatedParagraph) {
          throw new Error('Failed to save generated paragraph');
        }

        console.log(`✅ [API] Generated and saved paragraph ${paragraphIndex}`);

        return json({
          success: true,
          data: {
            paragraphId: updatedParagraph.id,
            content: updatedParagraph.content,
            summary: updatedParagraph.summary,
            metadata: updatedParagraph.metadata,
            isExisting: false,
            generatedAt: updatedParagraph.generatedAt
          }
        });
      } else {
        // Paragraph doesn't exist in database, return generated content directly
        console.log(`✅ [API] Generated content for non-persisted paragraph ${paragraphIndex}`);

        return json({
          success: true,
          data: {
            paragraphId,
            content: generatedParagraph.content,
            summary: generatedParagraph.summary,
            metadata: {
              ...generatedParagraph.metadata,
              keyPoints: generatedParagraph.keyPoints,
              examples: generatedParagraph.examples,
              generatedAt: new Date().toISOString(),
              model: 'gemini-1.5-flash'
            },
            isExisting: false,
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('❌ [API] Paragraph generation failed:', error);
      return json(
        { 
          error: 'Failed to generate paragraph',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [API] Request parsing failed:', error);
    return json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const paragraphId = url.searchParams.get('paragraphId');
    const action = url.searchParams.get('action');

    if (!paragraphId) {
      return json(
        { error: 'Missing required query parameter: paragraphId' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] GET paragraph request: ${paragraphId} (action: ${action})`);

    const paragraph = await ParagraphsService.getParagraphById(paragraphId);
    if (!paragraph) {
      return json(
        { error: 'Paragraph not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'status':
        return json({
          success: true,
          data: {
            paragraphId: paragraph.id,
            isGenerated: paragraph.isGenerated,
            hasContent: !!paragraph.content,
            summary: paragraph.summary,
            generatedAt: paragraph.generatedAt
          }
        });

      case 'content':
        if (!paragraph.isGenerated || !paragraph.content) {
          return json(
            { error: 'Paragraph content not yet generated' },
            { status: 404 }
          );
        }
        
        return json({
          success: true,
          data: {
            paragraphId: paragraph.id,
            content: paragraph.content,
            summary: paragraph.summary,
            metadata: paragraph.metadata,
            generatedAt: paragraph.generatedAt
          }
        });

      default:
        // Return full paragraph info
        return json({
          success: true,
          data: {
            paragraphId: paragraph.id,
            topicId: paragraph.topicId,
            chapterId: paragraph.chapterId,
            index: paragraph.index,
            content: paragraph.content,
            summary: paragraph.summary,
            metadata: paragraph.metadata,
            isGenerated: paragraph.isGenerated,
            generatedAt: paragraph.generatedAt,
            createdAt: paragraph.createdAt,
            updatedAt: paragraph.updatedAt
          }
        });
    }
  } catch (error) {
    console.error('❌ [API] GET paragraph failed:', error);
    return json(
      { 
        error: 'Failed to get paragraph',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

/**
 * Generate paragraph content using AI
 */
async function generateParagraphContent(
  topicTitle: string,
  chapterTitle: string,
  paragraphIndex: number,
  paragraphSummary?: string,
  options: {
    language?: SupportedLanguage;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    maxWords?: number;
    includeExamples?: boolean;
  } = {}
): Promise<ParagraphGeneration> {
  const {
    language = 'en',
    difficulty = 'intermediate',
    maxWords = MAX_WORDS_PER_PARAGRAPH,
    includeExamples = true
  } = options;

  console.log(`🤖 [API] Generating AI content for paragraph ${paragraphIndex} in "${chapterTitle}"`);

  const prompt = buildParagraphPrompt(
    topicTitle,
    chapterTitle,
    paragraphIndex,
    paragraphSummary,
    difficulty,
    maxWords,
    includeExamples,
    language
  );

  const response = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    prompt,
    output: {
      schema: ParagraphSchema,
    },
    config: {
      temperature: AI_MODEL_TEMPERATURE,
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    }
  });

  const paragraphData = response.output;
  console.log(`✅ [API] Generated paragraph content (${paragraphData.content.length} chars)`);
  
  return paragraphData;
}

/**
 * Build paragraph generation prompt
 */
function buildParagraphPrompt(
  topicTitle: string,
  chapterTitle: string,
  paragraphIndex: number,
  paragraphSummary: string | undefined,
  difficulty: string,
  maxWords: number,
  includeExamples: boolean,
  language: SupportedLanguage
): string {
  const basePrompt = getContentGenerationPrompt(
    topicTitle,
    `Chapter: ${chapterTitle}`,
    difficulty as 'beginner' | 'intermediate' | 'advanced',
    language
  );

  let specificPrompt = `${basePrompt}

Generate detailed content for paragraph ${paragraphIndex} in the chapter "${chapterTitle}" about ${topicTitle}.

Requirements:
- Write approximately ${maxWords} words
- Target ${difficulty} level readers
- Make it engaging and educational
- Use clear, concise language
- Include practical insights
`;

  if (paragraphSummary) {
    specificPrompt += `- Focus on: ${paragraphSummary}\n`;
  }

  if (includeExamples) {
    specificPrompt += `- Include relevant examples or analogies\n`;
  }

  specificPrompt += `
The paragraph should:
1. Build upon previous concepts logically
2. Introduce new information clearly
3. Connect to real-world applications
4. Maintain reader engagement
5. Set up for the next paragraph naturally

Provide the content along with a brief summary, key points, and any examples used.`;

  return specificPrompt;
}
