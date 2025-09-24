/**
 * API endpoint for topic analysis
 * Runs Genkit on the server side to avoid browser compatibility issues
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { GEMINI_API_KEY } from '$env/static/private';
import { getTopicAnalysisPrompt } from '$lib/services/aiPrompts.js';
import type { SupportedLanguage } from '$lib/types/language.js';
import { MAX_MINDMAP_NODES } from '$lib/settings';

// Initialize Genkit on the server
const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.7,
  }),
});

// Schema for topic breakdown
const TopicBreakdownSchema = z.object({
  mainTopic: z.string().describe('The main topic being analyzed'),
  description: z.string().describe('A clear description of the topic'),
  keyAspects: z.array(z.object({
    name: z.string().describe('Name of the aspect/concept'),
    description: z.string().describe('Brief description of this aspect'),
    importance: z.enum(['high', 'medium', 'low']).describe('Importance level'),
    connections: z.array(z.string()).describe('How this connects to other aspects')
  })).max(MAX_MINDMAP_NODES).describe(`Key aspects and concepts of the topic (maximum ${MAX_MINDMAP_NODES} aspects)`),
  learningPath: z.array(z.object({
    step: z.number().describe('Order in learning sequence'),
    concept: z.string().describe('Concept to learn'),
    prerequisites: z.array(z.string()).describe('What should be learned first')
  })).describe('Suggested learning sequence'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Overall difficulty level'),
  estimatedTime: z.string().describe('Estimated time to understand (e.g., "2-3 hours", "1 week")')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🔍 [API] Topic analysis request received');
    
    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_actual_api_key_here') {
      console.error('❌ [API] GEMINI_API_KEY not configured');
      return json({ 
        error: 'AI service not configured',
        details: 'GEMINI_API_KEY environment variable is not set or invalid'
      }, { status: 500 });
    }
    
    const { topic, language } = await request.json();
    
    if (!topic) {
      return json({ error: 'Topic is required' }, { status: 400 });
    }

    const aiLanguage = (language as SupportedLanguage) || 'en';
    console.log(`🔍 [API] Starting topic analysis for: "${topic}" in language: ${aiLanguage}`);
    console.log(`⚙️ [API] Max mindmap nodes setting: ${MAX_MINDMAP_NODES}`);

    // Get language-appropriate prompt with max aspects limit
    const prompt = getTopicAnalysisPrompt(topic, aiLanguage, MAX_MINDMAP_NODES);

    const result = await ai.generate({
      prompt,
      output: {
        schema: TopicBreakdownSchema,
      },
    });

    if (!result.output) {
      console.error(`❌ [API] No output received from Gemini for topic: "${topic}"`);
      throw new Error('No output received from AI');
    }

    console.log(`✅ [API] Successfully analyzed topic: "${topic}"`);
    console.log(`📊 [API] Generated breakdown with ${result.output.keyAspects.length} key aspects (max: ${MAX_MINDMAP_NODES})`);

    return json({ 
      success: true, 
      data: result.output 
    });

  } catch (error) {
    console.error('❌ [API] Error analyzing topic:', error);
    
    return json({ 
      error: 'Failed to analyze topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
