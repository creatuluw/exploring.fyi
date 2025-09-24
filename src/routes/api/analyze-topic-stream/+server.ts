/**
 * Streaming API endpoint for topic analysis (SSE)
 * Sends initial metadata immediately, then batches of aspects progressively
 */

import type { RequestHandler } from './$types';
import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { z } from 'zod';
import { GEMINI_API_KEY } from '$env/static/private';
import { getTopicAnalysisPrompt } from '$lib/services/aiPrompts.js';
import type { SupportedLanguage } from '$lib/types/language.js';
import { MAX_MINDMAP_NODES } from '$lib/settings';

const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: googleAI.model('gemini-2.5-flash', { temperature: 0.7 })
});

const TopicBreakdownSchema = z.object({
  mainTopic: z.string(),
  description: z.string(),
  keyAspects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    importance: z.enum(['high', 'medium', 'low']),
    connections: z.array(z.string()).default([])
  })).max(MAX_MINDMAP_NODES).describe(`Key aspects and concepts of the topic (maximum ${MAX_MINDMAP_NODES} aspects)`),
  learningPath: z.array(z.object({
    step: z.number(),
    concept: z.string(),
    prerequisites: z.array(z.string()).default([])
  })).default([]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedTime: z.string().default('')
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { topic, language } = await request.json();
    if (!topic) {
      return new Response('Topic is required', { status: 400 });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_actual_api_key_here') {
      return new Response('AI service not configured', { status: 500 });
    }

    const aiLanguage = (language as SupportedLanguage) || 'en';
    console.log(`🔍 [API Stream] Starting topic analysis for: "${topic}" in language: ${aiLanguage}`);
    console.log(`⚙️ [API Stream] Max mindmap nodes setting: ${MAX_MINDMAP_NODES}`);
    
    // Get language-appropriate prompt with max aspects limit
    const prompt = getTopicAnalysisPrompt(topic, aiLanguage, MAX_MINDMAP_NODES);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (obj: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        // Immediately send minimal metadata for instant UI
        send({ type: 'metadata', data: { mainTopic: topic, description: `Analyzing ${topic}...` } });

        let resultOutput: z.infer<typeof TopicBreakdownSchema> | null = null;
        try {
          const result = await ai.generate({
            prompt,
            output: { schema: TopicBreakdownSchema }
          });

          if (!result.output) throw new Error('No output');
          resultOutput = result.output;
        } catch (e) {
          send({ type: 'error', data: { message: 'Failed to analyze topic' } });
          controller.close();
          return;
        }

        // Send refined metadata (real description, difficulty, time)
        send({
          type: 'metadata',
          data: {
            mainTopic: resultOutput.mainTopic || topic,
            description: resultOutput.description,
            difficulty: resultOutput.difficulty,
            estimatedTime: resultOutput.estimatedTime
          }
        });

        // Batch aspects in small chunks to keep UI flowing
        const aspects = resultOutput.keyAspects || [];
        console.log(`📊 [API Stream] Generated breakdown with ${aspects.length} key aspects (max: ${MAX_MINDMAP_NODES})`);
        const batchSize = 4;
        for (let i = 0; i < aspects.length; i += batchSize) {
          const batch = aspects.slice(i, i + batchSize);
          send({ type: 'aspects_batch', data: batch });
          // brief pacing to allow UI to render progressively
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


