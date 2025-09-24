/**
 * Genkit Types
 * Types extracted from genkit.ts to avoid importing the actual genkit module on client side
 */

import { z } from 'zod';

// Schema definitions for AI responses
export const TopicBreakdownSchema = z.object({
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

export const ConceptExpansionSchema = z.object({
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

export const UrlAnalysisSchema = z.object({
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

export const ContentPageSchema = z.object({
  topic: z.string().describe('The main topic'),
  overview: z.string().describe('Comprehensive overview of the topic'),
  sections: z.array(z.object({
    title: z.string().describe('Section title'),
    content: z.string().describe('Detailed content for this section'),
    examples: z.array(z.string()).describe('Examples to illustrate the concept'),
    keyPoints: z.array(z.string()).describe('Important points to remember')
  })).describe('Main content sections'),
  prerequisites: z.array(z.string()).describe('What you should know before learning this'),
  practicalSteps: z.array(z.object({
    step: z.number().describe('Step number'),
    action: z.string().describe('What to do'),
    explanation: z.string().describe('Why this step is important')
  })).describe('Practical steps to apply this knowledge'),
  commonQuestions: z.array(z.object({
    question: z.string().describe('Frequently asked question'),
    answer: z.string().describe('Clear answer to the question')
  })).describe('Common questions and answers'),
  nextSteps: z.array(z.string()).describe('What to learn or do next'),
  estimatedReadTime: z.string().describe('Estimated time to read and understand')
});

// Export types for use in other modules
export type TopicBreakdown = z.infer<typeof TopicBreakdownSchema>;
export type ConceptExpansion = z.infer<typeof ConceptExpansionSchema>;
export type UrlAnalysis = z.infer<typeof UrlAnalysisSchema>;
export type ContentPage = z.infer<typeof ContentPageSchema>;
