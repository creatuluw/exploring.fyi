/**
 * Content Generation Service
 * Handles AI-powered generation of comprehensive content pages for topics and concepts
 */

import type { DetailedContentPage, SourceSuggestion, LearningResource } from '../types/index.js';

/**
 * Generates a comprehensive content page for a specific topic or concept
 */
export async function generateContentPage(
  topic: string, 
  context?: string, 
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
): Promise<DetailedContentPage> {
  console.log(`📝 [Content Gen] Starting content generation for: "${topic}"${context ? ` (context: "${context}")` : ''}`);
  
  try {
    console.log(`🤖 [Content Gen] Sending content generation request to API server...`);
    
    const response = await fetch('/api/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic, 
        context,
        difficulty: difficulty || 'intermediate'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [Content Gen] No data received from API for topic: "${topic}"`);
      throw new Error('No data received from API');
    }

    console.log(`✅ [Content Gen] Successfully generated content for: "${topic}"`);
    console.log(`📊 [Content Gen] Generated ${result.data.sections.length} content sections`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [Content Gen] Error generating content for "${topic}":`, error);
    throw new Error(`Failed to generate content for "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates source suggestions and learning resources for a topic
 */
export async function generateSourceSuggestions(
  topic: string,
  existingSources?: string[]
): Promise<SourceSuggestion[]> {
  console.log(`🔍 [Content Gen] Generating source suggestions for: "${topic}"`);
  
  try {
    console.log(`🤖 [Content Gen] Sending source suggestion request to API server...`);
    
    const response = await fetch('/api/suggest-sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic,
        existingSources: existingSources || []
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [Content Gen] No source suggestions received for topic: "${topic}"`);
      throw new Error('No source suggestions received from API');
    }

    console.log(`✅ [Content Gen] Generated ${result.data.length} source suggestions for: "${topic}"`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [Content Gen] Error generating sources for "${topic}":`, error);
    throw new Error(`Failed to generate sources for "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates learning resources tailored to user level and preferences
 */
export async function generateLearningResources(
  topic: string,
  userLevel: 'beginner' | 'intermediate' | 'advanced',
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading'
): Promise<LearningResource[]> {
  console.log(`🎓 [Content Gen] Generating learning resources for: "${topic}" (level: ${userLevel})`);
  
  try {
    console.log(`🤖 [Content Gen] Sending learning resource request to API server...`);
    
    const response = await fetch('/api/generate-resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic,
        userLevel,
        learningStyle: learningStyle || 'reading'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [Content Gen] No learning resources received for topic: "${topic}"`);
      throw new Error('No learning resources received from API');
    }

    console.log(`✅ [Content Gen] Generated ${result.data.length} learning resources for: "${topic}"`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [Content Gen] Error generating learning resources for "${topic}":`, error);
    throw new Error(`Failed to generate learning resources for "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates related concepts and connections for a topic
 */
export async function generateRelatedConcepts(
  topic: string,
  currentContext?: string,
  maxConcepts?: number
): Promise<Array<{
  name: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  connectionType: 'prerequisite' | 'related' | 'advanced' | 'application';
}>> {
  console.log(`🔗 [Content Gen] Generating related concepts for: "${topic}"`);
  
  try {
    console.log(`🤖 [Content Gen] Sending related concepts request to API server...`);
    
    const response = await fetch('/api/related-concepts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic,
        currentContext,
        maxConcepts: maxConcepts || 8
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [Content Gen] No related concepts received for topic: "${topic}"`);
      throw new Error('No related concepts received from API');
    }

    console.log(`✅ [Content Gen] Generated ${result.data.length} related concepts for: "${topic}"`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [Content Gen] Error generating related concepts for "${topic}":`, error);
    throw new Error(`Failed to generate related concepts for "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a unique content ID for a topic/concept combination
 */
export function createContentId(topic: string, context?: string): string {
  const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cleanContext = context ? context.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  
  if (cleanContext) {
    return `${cleanContext}-${cleanTopic}`;
  }
  
  return cleanTopic;
}

/**
 * Extracts key information from a topic for content generation
 */
export function extractTopicInfo(topic: string): {
  mainSubject: string;
  modifiers: string[];
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const words = topic.toLowerCase().split(/\s+/);
  
  // Simple heuristics for topic analysis
  const complexityIndicators = {
    simple: ['intro', 'basic', 'fundamentals', 'overview', 'what', 'how'],
    complex: ['advanced', 'deep', 'comprehensive', 'analysis', 'optimization', 'implementation']
  };
  
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  
  for (const word of words) {
    if (complexityIndicators.simple.some(indicator => word.includes(indicator))) {
      complexity = 'simple';
      break;
    }
    if (complexityIndicators.complex.some(indicator => word.includes(indicator))) {
      complexity = 'complex';
      break;
    }
  }
  
  // Extract main subject (usually the noun)
  const mainSubject = words.length > 0 ? words[words.length - 1] : topic;
  const modifiers = words.slice(0, -1);
  
  return {
    mainSubject,
    modifiers,
    complexity
  };
}
