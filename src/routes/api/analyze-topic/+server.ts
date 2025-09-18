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
  })).describe('Key aspects and concepts of the topic'),
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
    
    const { topic } = await request.json();
    
    if (!topic) {
      return json({ error: 'Topic is required' }, { status: 400 });
    }

    console.log(`🔍 [API] Starting topic analysis for: "${topic}"`);

    const result = await ai.generate({
      prompt: `Analyze the topic "${topic}" for educational purposes. Provide a comprehensive breakdown that includes:

1. A clear description of what this topic is about
2. 4-6 key aspects or concepts that make up this topic
3. A logical learning path with prerequisites
4. Difficulty level assessment
5. Time estimation for understanding

Focus on creating a learning-oriented analysis that helps someone understand how to approach this topic systematically. Consider both theoretical understanding and practical application.

Make sure each key aspect includes:
- Clear name and description
- Importance level (high/medium/low)
- Connections to other aspects

For the learning path, ensure:
- Logical progression from basic to advanced
- Clear prerequisites for each step
- Practical learning sequence

Topic to analyze: ${topic}`,
      output: {
        schema: TopicBreakdownSchema,
      },
    });

    if (!result.output) {
      console.error(`❌ [API] No output received from Gemini for topic: "${topic}"`);
      throw new Error('No output received from AI');
    }

    console.log(`✅ [API] Successfully analyzed topic: "${topic}"`);
    console.log(`📊 [API] Generated breakdown with ${result.output.keyAspects.length} key aspects`);

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
