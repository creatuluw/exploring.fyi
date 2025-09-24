/**
 * Streaming Content Generation Service
 * Handles progressive content generation with section-by-section loading
 */

import type { DetailedContentPage } from '../types/index.js';

export interface ContentMetadata {
  id: string;
  topic: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
  sectionTitles: string[];
  learningObjectives: string[];
  prerequisites: string[];
  nextSteps: string[];
  relatedTopics: Array<{
    name: string;
    description: string;
    relevance: 'high' | 'medium' | 'low';
    connectionType: 'prerequisite' | 'related' | 'advanced' | 'application';
  }>;
  lastUpdated: Date;
}

export interface ContentParagraph {
  id: string;
  title: string;
  content: string;
  order: number;
  sectionId: string;
  isLoaded?: boolean;
}

export interface ContentSection {
  id: string;
  title: string;
  type: 'introduction' | 'explanation' | 'example' | 'application' | 'summary';
  order: number;
  paragraphs: ContentParagraph[];
}

export interface StreamingContentCallback {
  onMetadata?: (metadata: ContentMetadata, fromCache?: boolean) => void;
  onOutline?: (sections: ContentSection[], fromCache?: boolean) => void;
  onParagraph?: (paragraph: ContentParagraph, fromCache?: boolean) => void;
  onParagraphChunk?: (paragraphId: string, content: string) => void;
  onParagraphComplete?: (paragraph: ContentParagraph, fromCache?: boolean) => void;
  onComplete?: (contentPage: DetailedContentPage, fromCache?: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced context interface for better AI prompts
 */
export interface EnhancedContext {
  mainTopic?: {
    title: string;
    description: string;
  };
  nodeInfo?: {
    description: string;
    level: number;
    importance: string;
    connections: string[];
    parentId: string;
  };
}

/**
 * Generates content progressively with streaming, with caching support
 */
export async function generateContentStreaming(
  topic: string,
  callbacks: StreamingContentCallback,
  context?: string | EnhancedContext,
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  topicId?: string
): Promise<void> {
  console.log(`📝 [Streaming Content] Starting streaming generation for: "${topic}"`);
  
  // Check for cached content first if we have a topicId
  if (topicId) {
    const { ContentCacheService } = await import('../database/contentCache.js');
    const cachedContent = await ContentCacheService.getCachedContent(topicId, topic, context, difficulty);
    
    if (cachedContent) {
      console.log(`🎯 [Streaming Content] Using cached content for: "${topic}"`);
      
      // Simulate streaming by delivering cached content progressively
      const metadata: ContentMetadata = {
        id: cachedContent.id,
        topic: cachedContent.topic,
        title: cachedContent.title,
        description: cachedContent.description,
        difficulty: cachedContent.difficulty,
        estimatedReadTime: cachedContent.estimatedReadTime,
        sectionTitles: cachedContent.sections.map(s => s.title),
        learningObjectives: cachedContent.learningObjectives,
        prerequisites: cachedContent.prerequisites,
        nextSteps: cachedContent.nextSteps,
        relatedTopics: cachedContent.relatedTopics,
        lastUpdated: cachedContent.lastUpdated
      };
      
      // Send metadata immediately
      if (callbacks.onMetadata) {
        callbacks.onMetadata(metadata, true); // fromCache = true
      }
      
      // Send sections sequentially to match new streaming behavior
      for (const section of cachedContent.sections) {
        // Send outline with this section
        if (callbacks.onOutline) {
          callbacks.onOutline([section], true);
        }
        
        // Send paragraphs for this section with small delays
        for (const paragraph of section.paragraphs) {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (callbacks.onParagraph) {
            callbacks.onParagraph(paragraph, true);
          }
          
          // For cached content, simulate streaming for each paragraph if callback exists
          if (callbacks.onParagraphChunk && paragraph.content) {
            const words = paragraph.content.split(' ');
            let accumulatedContent = '';
            
            for (const word of words) {
              accumulatedContent += word + ' ';
              callbacks.onParagraphChunk(paragraph.id, accumulatedContent.trim());
              await new Promise(resolve => setTimeout(resolve, 30)); // Simulate typing speed
            }
          }
          
          if (callbacks.onParagraphComplete) {
            callbacks.onParagraphComplete(paragraph, true);
          }
        }
      }
      
      // Send completion
      if (callbacks.onComplete) {
        callbacks.onComplete(cachedContent, true); // fromCache = true
      }
      
      return;
    }
  }
  
  console.log(`🆕 [Streaming Content] No cached content found, generating fresh content for: "${topic}"`);
  
  try {
    const response = await fetch('/api/generate-content-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic, 
        context,
        enhancedContext: typeof context === 'object' ? context : undefined, // Pass enhanced context if available
        difficulty: difficulty || 'intermediate'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    // State tracking
    let metadata: ContentMetadata | null = null;
    let sections: ContentSection[] = [];
    const paragraphMap = new Map<string, ContentParagraph>();
    
    // Parse streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const messageData = line.slice(6); // Remove 'data: ' prefix
            const message = JSON.parse(messageData);

            switch (message.type) {
              case 'metadata':
                metadata = message.data;
                console.log(`📋 [Streaming Content] Received metadata for: "${metadata?.title}"`);
                if (callbacks.onMetadata && metadata) {
                  callbacks.onMetadata(metadata);
                }
                break;

              case 'outline':
                sections = message.data.sections;
                // Initialize empty paragraphs with loading state
                sections.forEach(section => {
                  section.paragraphs = section.paragraphs.map(p => ({
                    ...p,
                    content: '',
                    isLoaded: false,
                    sectionId: section.id
                  }));
                });
                
                console.log(`📋 [Streaming Content] Received outline with ${sections.length} sections and ${sections.reduce((acc, s) => acc + s.paragraphs.length, 0)} paragraphs`);
                if (callbacks.onOutline) {
                  callbacks.onOutline(sections, false);
                }
                break;
                
              case 'paragraph':
                const paragraph = message.data as ContentParagraph;
                paragraph.isLoaded = true;
                paragraphMap.set(paragraph.id, paragraph);
                
                // Update the corresponding paragraph in sections
                const targetSection = sections.find(s => s.id === paragraph.sectionId);
                if (targetSection) {
                  const targetParagraph = targetSection.paragraphs.find(p => p.id === paragraph.id);
                  if (targetParagraph) {
                    Object.assign(targetParagraph, paragraph);
                  }
                }
                
                console.log(`📄 [Streaming Content] Started paragraph: "${paragraph.title}" (${paragraph.sectionId})`);
                if (callbacks.onParagraph) {
                  callbacks.onParagraph(paragraph, false);
                }
                break;

              case 'paragraph_chunk':
                const chunkData = message.data;
                console.log(`📝 [Streaming Content] Received chunk for paragraph: ${chunkData.id}`);
                
                // Update the paragraph content in real-time
                const chunkParagraph = paragraphMap.get(chunkData.id);
                if (chunkParagraph) {
                  chunkParagraph.content = chunkData.content;
                  
                  // Also update in sections
                  const chunkSection = sections.find(s => s.id === chunkParagraph.sectionId);
                  if (chunkSection) {
                    const chunkTargetParagraph = chunkSection.paragraphs.find(p => p.id === chunkData.id);
                    if (chunkTargetParagraph) {
                      chunkTargetParagraph.content = chunkData.content;
                    }
                  }
                }
                
                if (callbacks.onParagraphChunk) {
                  callbacks.onParagraphChunk(chunkData.id, chunkData.content);
                }
                break;

              case 'paragraph_complete':
                const completeParagraph = message.data as ContentParagraph;
                completeParagraph.isLoaded = true;
                paragraphMap.set(completeParagraph.id, completeParagraph);
                
                // Update the final paragraph content in sections
                const completeSection = sections.find(s => s.id === completeParagraph.sectionId);
                if (completeSection) {
                  const completeTargetParagraph = completeSection.paragraphs.find(p => p.id === completeParagraph.id);
                  if (completeTargetParagraph) {
                    Object.assign(completeTargetParagraph, completeParagraph);
                  }
                }
                
                console.log(`✅ [Streaming Content] Completed paragraph: "${completeParagraph.title}" (${completeParagraph.sectionId})`);
                if (callbacks.onParagraphComplete) {
                  callbacks.onParagraphComplete(completeParagraph, false);
                }
                break;

              case 'complete':
                console.log(`🎉 [Streaming Content] Generation complete for: "${topic}"`);
                
                if (callbacks.onComplete && metadata) {
                  // Build complete content page
                  const contentPage: DetailedContentPage = {
                    id: metadata.id,
                    topic: metadata.topic,
                    title: metadata.title,
                    description: metadata.description,
                    difficulty: metadata.difficulty,
                    estimatedReadTime: metadata.estimatedReadTime,
                    sections: sections.sort((a, b) => a.order - b.order),
                    learningObjectives: metadata.learningObjectives,
                    prerequisites: metadata.prerequisites,
                    nextSteps: metadata.nextSteps,
                    relatedTopics: metadata.relatedTopics,
                    lastUpdated: metadata.lastUpdated
                  };
                  
                  // Cache the generated content if we have a topicId
                  if (topicId) {
                    try {
                      const { ContentCacheService } = await import('../database/contentCache.js');
                      await ContentCacheService.cacheContent(
                        topicId,
                        topic,
                        contentPage,
                        context,
                        difficulty
                      );
                      console.log(`💾 [Streaming Content] Successfully cached content for: "${topic}"`);
                    } catch (cacheError) {
                      console.warn(`⚠️ [Streaming Content] Failed to cache content for: "${topic}"`, cacheError);
                      // Don't fail the whole operation if caching fails
                    }
                  }
                  
                  callbacks.onComplete(contentPage);
                }
                return;

              case 'error':
                const errorMessage = message.error || 'Unknown streaming error';
                console.error(`❌ [Streaming Content] Error: ${errorMessage}`);
                if (callbacks.onError) {
                  callbacks.onError(errorMessage);
                }
                return;
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming message:', parseError);
          }
        }
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate streaming content';
    console.error(`❌ [Streaming Content] Error:`, error);
    if (callbacks.onError) {
      callbacks.onError(errorMessage);
    }
  }
}

/**
 * Helper function to estimate reading time based on content length
 */
export function estimateReadingTime(content: string): string {
  const wordsPerMinute = 200; // Average reading speed
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  if (minutes <= 1) {
    return '1 minute';
  } else if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Get section loading state for UI
 */
export function getSectionLoadingState(
  sectionIndex: number,
  loadedSections: number,
  totalSections: number
): 'loaded' | 'loading' | 'pending' {
  if (sectionIndex < loadedSections) {
    return 'loaded';
  } else if (sectionIndex === loadedSections) {
    return 'loading';
  } else {
    return 'pending';
  }
}
