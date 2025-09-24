/**
 * Streaming API endpoint for URL analysis (SSE)
 * Sends initial metadata immediately, then batches of concepts progressively
 */

import type { RequestHandler } from './$types';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { GEMINI_API_KEY } from '$env/static/private';
import { getUrlAnalysisPrompt } from '$lib/services/aiPrompts.js';
import type { SupportedLanguage } from '$lib/types/language.js';

const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: googleAI.model('gemini-2.5-flash', { temperature: 0.7 })
});

const UrlAnalysisSchema = z.object({
  title: z.string(),
  domain: z.string(),
  contentType: z.enum(['article', 'documentation', 'tutorial', 'research', 'news', 'blog', 'other']),
  summary: z.string(),
  keyTopics: z.array(z.string()).default([]),
  concepts: z.array(z.object({
    name: z.string(),
    description: z.string(),
    importance: z.enum(['high', 'medium', 'low'])
  })),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  credibility: z.object({
    score: z.number().min(0).max(10),
    factors: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([])
  }),
  relatedTopics: z.array(z.string()).default([])
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url, language } = await request.json();
    if (!url) return new Response('URL is required', { status: 400 });
    try { new URL(url); } catch { return new Response('Invalid URL format', { status: 400 }); }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_actual_api_key_here') {
      return new Response('AI service not configured', { status: 500 });
    }

    const aiLanguage = (language as SupportedLanguage) || 'en';
    const prompt = getUrlAnalysisPrompt(url, aiLanguage);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        // Immediate metadata
        const domain = new URL(url).hostname;
        send({ type: 'metadata', data: { title: `Content from ${domain}`, summary: `Analyzing ${url}...`, domain } });

        let resultOutput: z.infer<typeof UrlAnalysisSchema> | null = null;
        try {
          const result = await ai.generate({ prompt, output: { schema: UrlAnalysisSchema } });
          if (!result.output) throw new Error('No output');
          resultOutput = result.output;
        } catch (e) {
          send({ type: 'error', data: { message: 'Failed to analyze URL' } });
          controller.close();
          return;
        }

        // Refined metadata
        send({
          type: 'metadata',
          data: {
            title: resultOutput.title,
            summary: resultOutput.summary,
            domain: resultOutput.domain,
            contentType: resultOutput.contentType,
            difficulty: resultOutput.difficulty,
            credibility: resultOutput.credibility
          }
        });

        // Stream concepts in batches
        const concepts = resultOutput.concepts || [];
        const batchSize = 4;
        for (let i = 0; i < concepts.length; i += batchSize) {
          const batch = concepts.slice(i, i + batchSize);
          send({ type: 'concepts_batch', data: batch });
          await new Promise((r) => setTimeout(r, 120));
        }

        send({ type: 'complete' });
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (err) {
    return new Response('Internal Server Error', { status: 500 });
  }
};


