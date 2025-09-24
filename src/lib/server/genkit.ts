/**
 * Genkit AI Configuration - Server Only
 * Sets up Google AI integration for content generation
 * This file should only be imported in server-side API routes
 */

import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';
import { AI_MODEL_TEMPERATURE } from '$lib/settings';

// Re-export schemas and types from the types file
export {
  TopicBreakdownSchema,
  ConceptExpansionSchema,
  UrlAnalysisSchema,
  ContentPageSchema,
  type TopicBreakdown,
  type ConceptExpansion,
  type UrlAnalysis,
  type ContentPage
} from '../types/genkit.js';

// Configure Genkit with Google AI
export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: AI_MODEL_TEMPERATURE,
  }),
});
