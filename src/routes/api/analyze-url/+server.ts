/**
 * API endpoint for URL analysis
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

// Schema for URL analysis
const UrlAnalysisSchema = z.object({
  title: z.string().describe('Title of the content'),
  domain: z.string().describe('Website domain'),
  contentType: z.enum(['article', 'documentation', 'tutorial', 'research', 'news', 'blog', 'other']),
  summary: z.string().describe('Summary of the main content'),
  keyTopics: z.array(z.string()).describe('Main topics covered'),
  concepts: z.array(z.object({
    name: z.string().describe('Concept name'),
    description: z.string().describe('What this concept means'),
    importance: z.enum(['high', 'medium', 'low'])
  })).describe('Key concepts explained in the content'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  credibility: z.object({
    score: z.number().min(0).max(10).describe('Credibility score out of 10'),
    factors: z.array(z.string()).describe('Factors affecting credibility'),
    warnings: z.array(z.string()).describe('Any credibility concerns')
  }).describe('Content credibility assessment'),
  relatedTopics: z.array(z.string()).describe('Topics that would be good to explore next')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🔍 [API] URL analysis request received');
    
    const { url } = await request.json();
    
    if (!url) {
      return json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return json({ error: 'Invalid URL format' }, { status: 400 });
    }

    console.log(`🔍 [API] Starting URL analysis for: "${url}"`);

    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;

    const result = await ai.generate({
      prompt: `Analyze the URL "${url}" and provide information about the likely content. Based on the domain "${domain}" and path "${path}", infer what type of content this might contain.

Consider:
1. Domain reputation and type (educational, commercial, news, documentation, etc.)
2. URL structure and path indicators
3. Likely content type and topics
4. Educational value and credibility
5. What concepts someone might learn from this content

Provide a comprehensive analysis including:
- Likely title and content type
- Main topics and concepts covered
- Difficulty level for learners
- Credibility assessment
- Related topics for further exploration

Focus on educational aspects and how this content could fit into a learning journey.

URL to analyze: ${url}`,
      output: {
        schema: UrlAnalysisSchema,
      },
    });

    if (!result.output) {
      console.error(`❌ [API] No output received from Gemini for URL: "${url}"`);
      throw new Error('No output received from AI');
    }

    console.log(`✅ [API] Successfully analyzed URL: "${url}"`);
    console.log(`📊 [API] Generated analysis with ${result.output.concepts.length} key concepts`);

    return json({ 
      success: true, 
      data: result.output 
    });

  } catch (error) {
    console.error('❌ [API] Error analyzing URL:', error);
    
    return json({ 
      error: 'Failed to analyze URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
