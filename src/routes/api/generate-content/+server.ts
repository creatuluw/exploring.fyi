/**
 * API endpoint for content generation
 * Generates comprehensive content pages for topics using Genkit AI
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

// Schema for detailed content page
const ContentPageSchema = z.object({
  id: z.string().describe('Unique identifier for the content page'),
  topic: z.string().describe('The main topic this content covers'),
  title: z.string().describe('Compelling title for the content page'),
  description: z.string().describe('Brief description of what the content covers'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Content difficulty level'),
  estimatedReadTime: z.string().describe('Estimated reading time (e.g., "15 minutes")'),
  sections: z.array(z.object({
    id: z.string().describe('Section identifier'),
    title: z.string().describe('Section title'),
    content: z.string().describe('Detailed section content in markdown format'),
    type: z.enum(['introduction', 'explanation', 'example', 'application', 'summary']).describe('Type of content section'),
    order: z.number().describe('Order of this section in the content')
  })).describe('Main content sections'),
  learningObjectives: z.array(z.string()).describe('What the reader will learn'),
  prerequisites: z.array(z.string()).describe('What the reader should know beforehand'),
  nextSteps: z.array(z.string()).describe('Recommended next learning steps'),
  relatedTopics: z.array(z.object({
    name: z.string().describe('Name of related topic'),
    description: z.string().describe('How this topic relates'),
    relevance: z.enum(['high', 'medium', 'low']).describe('Relevance level'),
    connectionType: z.enum(['prerequisite', 'related', 'advanced', 'application']).describe('Type of connection')
  })).describe('Topics related to this content')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📝 [API] Content generation request received');
    
    const { topic, context, difficulty } = await request.json();
    
    if (!topic) {
      return json({ error: 'Topic is required' }, { status: 400 });
    }

    console.log(`📝 [API] Starting content generation for: "${topic}" (difficulty: ${difficulty || 'intermediate'})`);

    const contextPrompt = context ? ` in the context of "${context}"` : '';
    const difficultyLevel = difficulty || 'intermediate';

    const result = await ai.generate({
      prompt: `Generate comprehensive educational content for the topic "${topic}"${contextPrompt}. 

Target audience level: ${difficultyLevel}

Create detailed, well-structured content that includes:

1. **Compelling Introduction**: Clear explanation of what the topic is and why it matters
2. **Core Explanations**: Break down key concepts with clear explanations
3. **Practical Examples**: Real-world examples that illustrate the concepts
4. **Applications**: How this knowledge can be applied
5. **Summary**: Key takeaways and reinforcement

Content Requirements:
- Write at a ${difficultyLevel} level
- Use clear, engaging language
- Include specific examples and use cases
- Provide actionable information
- Structure content logically from basic to advanced concepts
- Make it comprehensive enough for deep understanding

Additional Requirements:
- Learning objectives should be specific and measurable
- Prerequisites should be realistic and necessary
- Next steps should provide clear progression paths
- Related topics should genuinely enhance understanding
- Content should be engaging and educational

Generate content that would take approximately 10-20 minutes to read and understand thoroughly.

Topic: ${topic}`,
      output: {
        schema: ContentPageSchema,
      },
    });

    if (!result.output) {
      console.error(`❌ [API] No output received from Gemini for topic: "${topic}"`);
      throw new Error('No output received from AI');
    }

    // Add current timestamp and generate unique ID
    const contentPage = {
      ...result.output,
      id: result.output.id || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date(),
    };

    console.log(`✅ [API] Successfully generated content for: "${topic}"`);
    console.log(`📊 [API] Generated content with ${contentPage.sections.length} sections`);

    return json({ 
      success: true, 
      data: contentPage 
    });

  } catch (error) {
    console.error('❌ [API] Error generating content:', error);
    
    return json({ 
      error: 'Failed to generate content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
