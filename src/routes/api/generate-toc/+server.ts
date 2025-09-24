/**
 * Generate Table of Contents API
 * SSE-capable endpoint for streaming ToC generation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_CHAPTERS_GENERATED, AI_MODEL_TEMPERATURE, AI_MAX_OUTPUT_TOKENS } from '$lib/settings';
// Temporarily comment out problematic imports
// import { TocGenerationService } from '$lib/services/tocGeneration.js';
// import { session } from '$lib/stores/session.js';
// import { get } from 'svelte/store';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { GEMINI_API_KEY } from '$env/static/private';

// Initialize Genkit on the server
const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.7,
  }),
});

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    console.log('📚 [API] ToC generation request received');
    
    // First check if the API is properly configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_actual_api_key_here') {
      console.error('❌ [API] GEMINI_API_KEY not configured properly');
      return json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { 
      topicId, 
      topic, 
      options = {},
      streaming = false,
      forceRegenerate = false 
    } = body;

    // Validate required fields
    if (!topicId || !topic) {
      return json(
        { error: 'Missing required fields: topicId and topic' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] Generating ToC for topic: "${topic}" (${topicId})`);

    // Handle streaming requests
    if (streaming) {
      return handleStreamingRequest(topicId, topic, options);
    }

    // Handle regular JSON requests
    try {
      console.log(`🔑 [API] GEMINI_API_KEY configured: ${!!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_actual_api_key_here'}`);
      
      let chaptersWithParagraphs;
      
      // Skip database check for now to isolate the issue
      console.log(`🔍 [API] Skipping database check, proceeding directly to generation`);
      // if (!forceRegenerate) {
      //   console.log(`🔍 [API] Checking for existing ToC for topic: ${topicId}`);
      //   try {
      //     const existingToc = await TocGenerationService.getExistingToc(topicId);
      //     if (existingToc && existingToc.length > 0) {
      //       console.log(`ℹ️ [API] Found existing ToC with ${existingToc.length} chapters`);
      //       chaptersWithParagraphs = existingToc;
      //       return json({
      //         success: true,
      //         data: {
      //           topicId,
      //           topic,
      //           chapters: chaptersWithParagraphs,
      //           totalChapters: chaptersWithParagraphs.length,
      //           totalParagraphs: chaptersWithParagraphs.reduce(
      //             (sum, ch) => sum + ch.paragraphs.length, 
      //             0
      //           ),
      //           isExisting: true
      //         }
      //       });
      //     }
      //   } catch (existingTocError) {
      //     console.warn(`⚠️ [API] Failed to check existing ToC (will continue with generation):`, existingTocError);
      //   }
      // }

      // Return a simple test response to see if the endpoint works
      console.log(`🤖 [API] Testing simple response for: "${topic}"`);
      
      // Simple test response without AI generation
      chaptersWithParagraphs = [{
        id: 'test-chapter',
        topicId: topicId,
        index: 1,
        title: 'Test Chapter',
        description: 'This is a test chapter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paragraphs: [{
          id: 'test-paragraph',
          chapterId: 'test-chapter',
          topicId: topicId,
          index: 1,
          summary: 'Test paragraph summary',
          content: null,
          isGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          generatedAt: null,
          metadata: null
        }]
      }];
      
      // chaptersWithParagraphs = await generateTocInAPI(topicId, topic, options, ai);

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
          )
        }
      });
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
    const streaming = url.searchParams.get('streaming') === 'true';

    if (!topicId || !topic) {
      return json(
        { error: 'Missing required query parameters: topicId and topic' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] GET ToC request for topic: "${topic}" (${topicId})`);

    // Check if topicId is a UUID or a slug and handle accordingly
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId);
    let actualTopicId = topicId;
    
    if (!isUuid) {
      console.log(`⚠️ [API] TopicId "${topicId}" is not a UUID, will proceed with generation using the provided ID`);
      // For non-UUID topic IDs, we'll proceed with generation since we don't have session context here
      // The page load function should handle UUID conversion before calling this API
    }

    // Check for existing ToC first
    const existingToc = await TocGenerationService.getExistingToc(actualTopicId);
    
    if (existingToc) {
      console.log(`✅ [API] Returning existing ToC with ${existingToc.length} chapters`);
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
          isExisting: true
        }
      });
    }

    // Handle streaming requests for new ToC
    if (streaming) {
      return handleStreamingRequest(topicId, topic, {});
    }

      // Generate new ToC using the API-based method
      const chaptersWithParagraphs = await generateTocInAPI(actualTopicId, topic, {}, ai);

    return json({
      success: true,
      data: {
        topicId: actualTopicId,
        topic,
        chapters: chaptersWithParagraphs,
        totalChapters: chaptersWithParagraphs.length,
        totalParagraphs: chaptersWithParagraphs.reduce(
          (sum, ch) => sum + ch.paragraphs.length, 
          0
        ),
        isExisting: false
      }
    });
  } catch (error) {
    console.error('❌ [API] GET ToC failed:', error);
    console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ [API] Full error object:', error);
    return json(
      { 
        error: 'Failed to get ToC',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
};

/**
 * Handle Server-Sent Events streaming for real-time ToC generation
 */
async function handleStreamingRequest(
  topicId: string, 
  topic: string, 
  options: any
): Promise<Response> {
  console.log(`📡 [API] Starting streaming ToC generation for: "${topic}"`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial event
      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        topic,
        topicId,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(startEvent));

      // Generate ToC and simulate streaming
      try {
        const chaptersWithParagraphs = await generateTocInAPI(topicId, topic, options, ai);
        
        // Simulate streaming by emitting chapters progressively
        for (let i = 0; i < chaptersWithParagraphs.length; i++) {
          const chapter = chaptersWithParagraphs[i];
          const chapterEvent = `data: ${JSON.stringify({
            type: 'chapter',
            data: {
              index: i,
              title: chapter.title,
              description: chapter.description
            },
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(chapterEvent));
          
          // Add small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        const completeEvent = `data: ${JSON.stringify({
          type: 'complete',
          data: {
            topicId,
            topic,
            chapters: chaptersWithParagraphs,
            totalChapters: chaptersWithParagraphs.length,
            totalParagraphs: chaptersWithParagraphs.reduce(
              (sum, ch) => sum + ch.paragraphs.length, 
              0
            )
          },
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(completeEvent));
        controller.close();
      } catch (error) {
        const errorEvent = `data: ${JSON.stringify({
          type: 'error',
          error: 'ToC generation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

/**
 * Generate ToC directly in the API endpoint (bypassing service dynamic imports)
 */
async function generateTocInAPI(topicId: string, topic: string, options: any, ai: any): Promise<any[]> {
  try {
    const { z } = await import('zod');
    const { getTopicAnalysisPrompt } = await import('$lib/services/aiPrompts.js');
    
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

    const {
      language = 'en',
      difficulty = 'intermediate',
      maxChapters = MAX_CHAPTERS_GENERATED,
      context,
      nodeDescription
    } = options;

    // Build prompt
    let promptContext = `Topic: ${topic}`;
    if (context) {
      promptContext += `\nContext: ${context}`;
    }
    if (nodeDescription) {
      promptContext += `\nNode Description: ${nodeDescription}`;
    }

    const basePrompt = getTopicAnalysisPrompt ? getTopicAnalysisPrompt(topic, language) : `Analyze the topic: ${topic}`;
    
    const prompt = `${basePrompt}

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

Focus on creating a ToC that enables sequential paragraph generation where users can request "Explain next paragraph" to get detailed content on-demand.

IMPORTANT: 
- Each chapter MUST have all required fields: title, description, paragraphCount, and paragraphSummaries
- The paragraphCount must be a number between 2 and 8
- Generate exactly ${maxChapters} complete chapters
- Ensure the response is valid JSON and complete`;

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
    console.log(`📊 [API] ToC data:`, JSON.stringify(tocData, null, 2));

    // Skip database persistence for now to test AI generation
    console.log(`🔄 [API] Skipping database persistence for now`);
    
    // Mock the expected format for testing
    const mockChaptersWithParagraphs = tocData.chapters.map((chapter, index) => ({
      id: `mock-chapter-${index}`,
      topicId: topicId,
      index: index + 1,
      title: chapter.title,
      description: chapter.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paragraphs: Array.from({ length: chapter.paragraphCount }, (_, pIndex) => ({
        id: `mock-paragraph-${index}-${pIndex}`,
        chapterId: `mock-chapter-${index}`,
        topicId: topicId,
        index: pIndex + 1,
        summary: chapter.paragraphSummaries?.[pIndex] || `Paragraph ${pIndex + 1}`,
        content: null,
        isGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generatedAt: null,
        metadata: null
      }))
    }));
    
    return mockChaptersWithParagraphs;
  } catch (error) {
    console.error('❌ [API] Error in generateTocInAPI:', error);
    throw error;
  }
}
