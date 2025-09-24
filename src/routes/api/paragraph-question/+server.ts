/**
 * API endpoint for asking questions about specific paragraphs
 * Uses AI to answer questions with paragraph context
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { question, paragraphContent, sectionTitle, topicTitle, context } = await request.json();

    if (!question || !paragraphContent) {
      return json({
        success: false,
        error: 'Question and paragraph content are required'
      }, { status: 400 });
    }

    console.log(`❓ [Paragraph Q&A API] Answering question about paragraph in "${sectionTitle}" of topic "${topicTitle}"`);

    // Generate answer using AI with paragraph context
    const result = await ai.generate({
      prompt: `You are an educational AI assistant helping a user understand learning content. The user has asked a question about a specific paragraph from a learning topic.

**Topic**: ${topicTitle}
**Section**: ${sectionTitle}
**Paragraph Content**:
${paragraphContent}

**User's Question**: ${question}

${context ? `**Additional Context**: ${context}` : ''}

Please provide a clear, helpful, and educational answer to the user's question. Focus specifically on the content provided in the paragraph, but you can also draw connections to related concepts when helpful.

Requirements:
- Answer directly and clearly
- Use examples when appropriate
- If the question cannot be answered from the paragraph content, say so and provide general guidance
- Keep the answer concise but thorough
- Use a friendly, educational tone
- Format your response in markdown for better readability

Answer:`,
    });

    if (!result.text) {
      console.error('❌ [Paragraph Q&A API] No response generated from AI');
      return json({
        success: false,
        error: 'Failed to generate answer'
      }, { status: 500 });
    }

    console.log(`✅ [Paragraph Q&A API] Successfully generated answer for question about "${topicTitle}"`);

    return json({
      success: true,
      data: {
        answer: result.text,
        aiModel: 'gemini-2.5-flash',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Paragraph Q&A API] Error processing question:', error);
    return json({
      success: false,
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

