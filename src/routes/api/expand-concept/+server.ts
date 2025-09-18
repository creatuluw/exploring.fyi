/**
 * API endpoint for concept expansion
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

// Schema for concept expansion
const ConceptExpansionSchema = z.object({
  concept: z.string().describe('The concept being expanded'),
  subConcepts: z.array(z.object({
    name: z.string().describe('Name of the sub-concept'),
    description: z.string().describe('Clear explanation of this sub-concept'),
    examples: z.array(z.string()).describe('Real-world examples'),
    relatedTo: z.array(z.string()).describe('Related concepts'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced'])
  })).describe('Sub-concepts that make up this concept'),
  practicalApplications: z.array(z.string()).describe('How this concept is used in practice'),
  commonMisconceptions: z.array(z.string()).describe('Things people often get wrong'),
  resources: z.array(z.object({
    type: z.enum(['article', 'video', 'book', 'course', 'documentation']),
    title: z.string(),
    url: z.string().optional(),
    description: z.string()
  })).describe('Helpful learning resources')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🔍 [API] Concept expansion request received');
    
    const { concept, parentTopic } = await request.json();
    
    if (!concept) {
      return json({ error: 'Concept is required' }, { status: 400 });
    }

    console.log(`🔍 [API] Starting concept expansion for: "${concept}"${parentTopic ? ` (in context of "${parentTopic}")` : ''}`);

    const contextPrompt = parentTopic 
      ? `in the context of "${parentTopic}"`
      : '';

    const result = await ai.generate({
      prompt: `Expand the concept "${concept}" ${contextPrompt}. Provide a detailed breakdown that includes:

1. 3-5 sub-concepts that make up this concept
2. Practical applications and real-world examples
3. Common misconceptions people have
4. Learning resources and materials

For each sub-concept, provide:
- Clear name and description
- 2-3 concrete examples
- Related concepts for further exploration
- Appropriate difficulty level

Focus on:
- Practical understanding over theoretical complexity
- Real-world applications and examples
- Clear explanations suitable for learners
- Actionable next steps

Make the expansion educational and engaging, helping learners build a solid understanding of how this concept works and why it matters.

Concept to expand: ${concept}`,
      output: {
        schema: ConceptExpansionSchema,
      },
    });

    if (!result.output) {
      console.error(`❌ [API] No output received from Gemini for concept: "${concept}"`);
      throw new Error('No output received from AI');
    }

    console.log(`✅ [API] Successfully expanded concept: "${concept}"`);
    console.log(`📊 [API] Generated ${result.output.subConcepts.length} sub-concepts`);

    return json({ 
      success: true, 
      data: result.output 
    });

  } catch (error) {
    console.error('❌ [API] Error expanding concept:', error);
    
    return json({ 
      error: 'Failed to expand concept',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
