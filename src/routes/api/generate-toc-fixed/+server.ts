/**
 * Generate Table of Contents API - Fixed Version
 * Simplified endpoint without problematic service dependencies
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { TocGenerationService } from '$lib/services/tocGeneration.js';
import { dbHelpers } from '$lib/database/supabase.js';
import { GEMINI_API_KEY } from '$env/static/private';
import { MAX_CHAPTERS_GENERATED, AI_MODEL_TEMPERATURE, AI_MAX_OUTPUT_TOKENS } from '$lib/settings';

// Initialize Genkit on the server
const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.7,
  }),
});

// ToC schema
const TocSchema = z.object({
  topic: z.string(),
  description: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedTimeMinutes: z.number(),
  chapters: z.array(z.object({
    title: z.string(),
    description: z.string(),
    paragraphCount: z.number().min(2).max(8),
    paragraphSummaries: z.array(z.string()).optional()
  }))
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📚 [API] ToC generation request received');
    console.log('🔧 [API] Environment check - GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
    console.log('🔧 [API] AI instance initialized:', !!ai);
    
    // Check if API is properly configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_actual_api_key_here') {
      console.error('❌ [API] GEMINI_API_KEY not configured properly');
      return json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    console.log('📋 [API] Request body received:', JSON.stringify(body, null, 2));
    
    const { 
      topicId: topicSlug, // This is the slug from the URL
      topic, 
      sessionId, // Session ID should be passed from the frontend
      options = {},
      forceRegenerate = false
    } = body;

    // Validate required fields
    if (!topicSlug || !topic) {
      console.error('❌ [API] Missing required fields - topicSlug:', !!topicSlug, 'topic:', !!topic);
      return json(
        { error: 'Missing required fields: topicId and topic' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      console.error('❌ [API] Missing sessionId - required for slug-based topics');
      return json(
        { error: 'Missing sessionId - required for content generation' },
        { status: 400 }
      );
    }

    // Ensure session exists in database (create if needed)
    try {
      const { SessionService } = await import('$lib/database/sessions.js');
      await SessionService.ensureSessionExists(sessionId);
      console.log(`✅ [API] Session verified/created: ${sessionId}`);
    } catch (sessionError) {
      console.error('❌ [API] Failed to verify/create session:', sessionError);
      
      let errorMessage = 'Failed to verify session';
      if (sessionError instanceof Error) {
        errorMessage = sessionError.message;
      } else if (typeof sessionError === 'object' && sessionError !== null) {
        errorMessage = JSON.stringify(sessionError);
      }
      
      return json(
        { 
          error: 'Failed to verify session',
          details: errorMessage,
          sessionId: sessionId
        },
        { status: 500 }
      );
    }

    // Use the topic slug directly as the ID
    let topicId: string = topicSlug;

    console.log(`🔍 [API] Generating ToC for topic: "${topic}" (${topicId})`);
    console.log(`📝 [API] Session: ${sessionId}, Original slug: ${topicSlug}`);
    console.log(`⚙️ [API] Options:`, options);

    try {
      // Generate ToC with AI
      const {
        difficulty = 'intermediate',
        maxChapters = MAX_CHAPTERS_GENERATED  // Use configurable chapters limit
      } = options;

      const prompt = `Create a comprehensive Table of Contents for learning "${topic}" at ${difficulty} level.

Requirements:
- Generate exactly ${maxChapters} chapters that logically progress from basic concepts to advanced applications
- Each chapter MUST have exactly 4 required fields: title, description, paragraphCount, and paragraphSummaries
- The paragraphCount MUST be a number between 2 and 8 (inclusive)
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

CRITICAL VALIDATION REQUIREMENTS:
- EVERY chapter MUST include the paragraphCount field as a number
- EVERY chapter MUST include the paragraphSummaries field as an array of strings
- NO chapter can be missing any of the 4 required fields: title, description, paragraphCount, paragraphSummaries
- The paragraphCount MUST match the number of items in paragraphSummaries
- Generate exactly ${maxChapters} complete and valid chapters

Focus on creating a ToC that enables sequential paragraph generation where users can request "Explain next paragraph" to get detailed content on-demand.`;

      console.log(`🤖 [API] Making AI request for ToC generation...`);
      
      const response = await ai.generate({
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
      console.log(`✅ [API] Generated ToC with ${tocData.chapters.length} chapters`);
      
      // Persist the ToC to database using the TocGenerationService
      console.log(`💾 [API] Attempting to persist ToC to database...`);
      
      try {
        const chaptersWithParagraphs = await TocGenerationService.persistTocToDatabase(topicId, sessionId, tocData, options);
        console.log(`✅ [API] Successfully persisted ToC to database with ${chaptersWithParagraphs.length} chapters`);
        console.log(`📊 [API] ToC metadata stored in toc table for topic ${topicId}`);
        
        return json({
          success: true,
          data: {
            topicId,
            topic,
            chapters: chaptersWithParagraphs,
            totalChapters: chaptersWithParagraphs.length,
            totalParagraphs: chaptersWithParagraphs.reduce(
              (sum, ch) => sum + ch.paragraphs.length, 
              0
            ),
            isPersisted: true
          }
        });
      } catch (persistError) {
        console.error(`❌ [API] Failed to persist ToC to database:`, persistError);
        console.error(`❌ [API] Error details:`, persistError instanceof Error ? persistError.stack : persistError);
        
        // Better error handling to get the actual error message
        let errorMessage = 'Unknown database error';
        let errorDetails = null;
        
        if (persistError instanceof Error) {
          errorMessage = persistError.message;
          errorDetails = persistError.stack;
        } else if (typeof persistError === 'object' && persistError !== null) {
          errorMessage = JSON.stringify(persistError);
          errorDetails = persistError;
        } else {
          errorMessage = String(persistError);
        }
        
        // Return the database error with details for debugging
        return json(
          { 
            error: 'Failed to persist ToC to database',
            details: errorMessage,
            errorDetails: errorDetails,
            tocData: tocData, // Include the generated ToC data for debugging
            suggestion: 'Check database connection and schema compatibility'
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ [API] ToC generation failed:', error);
      console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return json(
        { 
          error: 'Failed to generate ToC',
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
    const topicId = url.searchParams.get('topicId');
    const topic = url.searchParams.get('topic');

    if (!topicId || !topic) {
      return json(
        { error: 'Missing required query parameters: topicId and topic' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] GET ToC request for topic: "${topic}" (${topicId})`);

    // Check for existing ToC in the database
    try {
      const existingToc = await TocGenerationService.getExistingToc(topicId);
      
      if (existingToc && existingToc.length > 0) {
        console.log(`✅ [API] Found existing ToC with ${existingToc.length} chapters`);
        return json({
          success: true,
          data: {
            topicId,
            topic,
            chapters: existingToc,
            totalChapters: existingToc.length,
            totalParagraphs: existingToc.reduce(
              (sum, ch) => sum + ch.paragraphs.length, 
              0
            ),
            isExisting: true,
            message: 'Found existing ToC'
          }
        });
      }
    } catch (dbError) {
      console.warn(`⚠️ [API] Failed to check existing ToC:`, dbError);
      // Continue to return no existing ToC if database check fails
    }

    // No existing ToC found
    console.log(`ℹ️ [API] No existing ToC found for topic ${topicId}`);
    return json({
      success: true,
      data: {
        topicId,
        topic,
        chapters: [],
        totalChapters: 0,
        totalParagraphs: 0,
        isExisting: false,
        message: 'No existing ToC found, use POST to generate'
      }
    });
  } catch (error) {
    console.error('❌ [API] GET ToC failed:', error);
    return json(
      { 
        error: 'Failed to get ToC',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};
