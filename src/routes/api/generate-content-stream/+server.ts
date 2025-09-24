/**
 * Streaming API endpoint for content generation
 * Generates content sections progressively for better UX
 */

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

// Schema for individual paragraphs
const ParagraphSchema = z.object({
  id: z.string().describe('Paragraph identifier'),
  title: z.string().describe('Paragraph title/heading'),
  content: z.string().describe('Paragraph content in clean, well-formatted markdown with proper headings, lists, code blocks, and emphasis. Use ## for section headings, ### for subsections, **bold** for emphasis, `code` for inline code, and ```language blocks for code examples.'),
  order: z.number().describe('Order within the section'),
  sectionId: z.string().describe('ID of the section this paragraph belongs to')
});

// Schema for individual content sections (structure only)
const ContentSectionSchema = z.object({
  id: z.string().describe('Section identifier'),
  title: z.string().describe('Section title'),
  paragraphs: z.array(z.object({
    id: z.string().describe('Paragraph identifier'),
    title: z.string().describe('Paragraph title/heading'),
    order: z.number().describe('Order within the section')
  })).describe('List of paragraph titles and IDs in this section'),
  type: z.enum(['introduction', 'explanation', 'example', 'application', 'summary']).describe('Type of content section'),
  order: z.number().describe('Order of this section in the content')
});

// Schema for content metadata (sent first)
const ContentMetadataSchema = z.object({
  id: z.string().describe('Unique identifier for the content page'),
  topic: z.string().describe('The main topic this content covers'),
  title: z.string().describe('Compelling title for the content page'),
  description: z.string().describe('Brief description of what the content covers'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Content difficulty level'),
  estimatedReadTime: z.string().describe('Estimated reading time (e.g., "15 minutes")'),
  sectionTitles: z.array(z.string()).describe('List of section titles to show in sidebar'),
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

interface StreamingMessage {
  type: 'metadata' | 'outline' | 'paragraph' | 'paragraph_chunk' | 'paragraph_complete' | 'complete' | 'error';
  data?: any;
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('📝 [Streaming API] Content generation request received');
    
    const { topic, context, enhancedContext, difficulty } = await request.json();
    
    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📝 [Streaming API] Starting streaming content generation for: "${topic}" (difficulty: ${difficulty || 'intermediate'})`);

    // Create enhanced context prompt
    let contextPrompt = '';
    let enhancedPromptContext = '';
    
    if (enhancedContext) {
      console.log('📋 [Streaming API] Using enhanced context for better AI prompts');
      
      // Build enhanced context prompt
      const parts = [];
      
      if (enhancedContext.mainTopic?.title && enhancedContext.mainTopic?.description) {
        parts.push(`**Main Topic Context**: "${enhancedContext.mainTopic.title}" - ${enhancedContext.mainTopic.description}`);
      }
      
      if (enhancedContext.nodeInfo?.description) {
        parts.push(`**Specific Focus**: ${enhancedContext.nodeInfo.description}`);
      }
      
      if (enhancedContext.nodeInfo?.connections && enhancedContext.nodeInfo.connections.length > 0) {
        parts.push(`**Related Concepts**: ${enhancedContext.nodeInfo.connections.join(', ')}`);
      }
      
      if (enhancedContext.nodeInfo?.importance) {
        parts.push(`**Importance Level**: ${enhancedContext.nodeInfo.importance}`);
      }
      
      if (parts.length > 0) {
        enhancedPromptContext = '\n\n' + parts.join('\n') + '\n';
        contextPrompt = ` within the following context:\n${parts.join('\n')}`;
      }
    } else if (context) {
      contextPrompt = ` in the context of "${context}"`;
    }
    
    const difficultyLevel = difficulty || 'intermediate';

    // Create a ReadableStream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendMessage = (message: StreamingMessage) => {
          try {
            if (controller.desiredSize !== null) {  // Check if controller is still active
              const data = `data: ${JSON.stringify(message)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          } catch (error) {
            console.warn('⚠️ [Streaming API] Failed to send message, client likely disconnected:', error.message);
            // Don't throw error, just log it - client disconnect is normal
          }
        };

        try {
          // Step 1: Generate content metadata first (basic info)
          console.log(`🔍 [Streaming API] Generating basic metadata for: "${topic}"`);
          
          const metadataResult = await ai.generate({
            prompt: `Generate basic content metadata for the topic "${topic}"${contextPrompt}.${enhancedPromptContext}

Target audience level: ${difficultyLevel}

Generate only the essential metadata:
1. Compelling title and description that considers the specific context
2. Basic section titles (4-6 main sections) relevant to the focus area
3. Learning objectives, prerequisites, next steps, and related topics
4. Estimated reading time

${enhancedContext ? 'Pay special attention to the provided context - tailor the content to fit within the broader learning framework and emphasize the specific focus area.' : 'Keep section titles high-level and focused. We\'ll generate detailed structure later.'}

Topic: ${topic}`,
            output: {
              schema: ContentMetadataSchema,
            },
          });

          if (!metadataResult.output) {
            throw new Error('Failed to generate content metadata');
          }

          const metadata = {
            ...metadataResult.output,
            id: metadataResult.output.id || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            lastUpdated: new Date(),
          };

          // Send metadata first
          sendMessage({ type: 'metadata', data: metadata });
          console.log(`✅ [Streaming API] Sent metadata with ${metadata.sectionTitles.length} section titles`);

          // Step 2: Generate sections sequentially for faster initial content
          console.log(`📋 [Streaming API] Starting sequential section generation for faster initial content...`);
          
          const sections = [];
          
          // Send initial empty outline to show section structure in UI
          sendMessage({ type: 'outline', data: { sections: [] } });
          
          // Generate each section sequentially
          for (let i = 0; i < metadata.sectionTitles.length; i++) {
            // Check if client is still connected before generating next section
            if (controller.desiredSize === null) {
              console.log('🔌 [Streaming API] Client disconnected, stopping generation');
              return;
            }
            
            const sectionTitle = metadata.sectionTitles[i];
            
            console.log(`📝 [Streaming API] Generating section ${i + 1}/${metadata.sectionTitles.length}: "${sectionTitle}"`);
            
            // Determine section type based on position and title
            let sectionType: 'introduction' | 'explanation' | 'example' | 'application' | 'summary' = 'explanation';
            if (i === 0 || sectionTitle.toLowerCase().includes('introduction') || sectionTitle.toLowerCase().includes('overview')) {
              sectionType = 'introduction';
            } else if (sectionTitle.toLowerCase().includes('example') || sectionTitle.toLowerCase().includes('demo')) {
              sectionType = 'example';
            } else if (sectionTitle.toLowerCase().includes('application') || sectionTitle.toLowerCase().includes('practice')) {
              sectionType = 'application';
            } else if (i === metadata.sectionTitles.length - 1 || sectionTitle.toLowerCase().includes('summary') || sectionTitle.toLowerCase().includes('conclusion')) {
              sectionType = 'summary';
            }

            // Generate section outline
            const sectionResult = await ai.generate({
              prompt: `Create a detailed outline for the section "${sectionTitle}" of the topic "${topic}"${contextPrompt}.${enhancedPromptContext}

This is section ${i + 1} of ${metadata.sectionTitles.length} in a comprehensive guide.
Target audience level: ${difficultyLevel}
Section type: ${sectionType}

Generate a structured outline with:
- 3-5 focused paragraph topics that will make up this section
- Each paragraph should cover ONE specific concept, technique, or idea
- Paragraph titles should be clear and descriptive
- Logical flow from basic to more detailed concepts
- Each paragraph should be self-contained but build upon previous ones

${enhancedContext ? 'Ensure paragraphs align with the provided context, emphasizing the specific focus area and its connections to related concepts.' : ''}

IMPORTANT: Only generate the STRUCTURE and paragraph titles, not the actual content. We'll generate paragraph content immediately after.

Section Title: ${sectionTitle}
Topic Context: ${topic}`,
              output: {
                schema: ContentSectionSchema,
              },
            });

            if (!sectionResult.output) {
              console.warn(`⚠️ [Streaming API] Failed to generate section outline: "${sectionTitle}"`);
              continue;
            }

            const section = {
              ...sectionResult.output,
              id: `section-${i}`,
              title: sectionTitle,
              order: i,
              type: sectionType
            };

            sections.push(section);
            
            // Send updated outline with this new section (still no paragraph content)
            sendMessage({ type: 'outline', data: { sections: [...sections] } });
            console.log(`✅ [Streaming API] Sent section outline: "${sectionTitle}" with ${section.paragraphs.length} paragraphs`);

            // Immediately generate all paragraphs for this section with streaming
            console.log(`🚀 [Streaming API] Generating ${section.paragraphs.length} paragraphs for section: "${sectionTitle}"`);
            
            for (const paragraphInfo of section.paragraphs) {
              // Check if client is still connected before generating next paragraph
              if (controller.desiredSize === null) {
                console.log('🔌 [Streaming API] Client disconnected, stopping generation');
                return;
              }
              
              try {
                // Send paragraph start notification
                sendMessage({ 
                  type: 'paragraph', 
                  data: {
                    id: paragraphInfo.id,
                    title: paragraphInfo.title,
                    order: paragraphInfo.order,
                    sectionId: section.id,
                    content: '', // Start with empty content
                    isStreaming: true
                  }
                });
                console.log(`🎬 [Streaming API] Started streaming paragraph: "${paragraphInfo.title}" (${section.id})`);

                // Generate paragraph with streaming
                const paragraphStream = await ai.generateStream({
                  prompt: `Generate detailed content for the paragraph "${paragraphInfo.title}" in section "${sectionTitle}" of the topic "${topic}"${contextPrompt}.${enhancedPromptContext}

Context:
- Section type: ${sectionType}
- Paragraph ${paragraphInfo.order + 1} of ${section.paragraphs.length} in this section
- Target audience level: ${difficultyLevel}
- Overall topic: ${topic}

Content Requirements:
- Write comprehensive, well-structured content (200-400 words) in clean markdown format
- Use proper markdown syntax: **bold** for emphasis, *italic* for emphasis, \`inline code\`, and \`\`\`language blocks for code examples
- Include concrete examples, code snippets, or practical applications where relevant
- Use bullet points (- or *) and numbered lists (1.) for better organization
- Add blockquotes (>) for important notes or tips
- Use clear, ${difficultyLevel}-level language with proper paragraph spacing
- Be specific and educational, making content self-contained but coherent
- Structure with subheadings (###) when appropriate for longer content

${enhancedContext ? 'Tailor the content to fit within the broader context provided, making clear connections to related concepts and emphasizing the specific focus area.' : 'Generate rich, detailed markdown content that provides real educational value for this specific paragraph topic.'}

Paragraph Topic: ${paragraphInfo.title}
Section Context: ${sectionTitle}`,
                });

                let accumulatedContent = '';
                
                // Stream content as it's generated
                for await (const chunk of paragraphStream.stream) {
                  if (chunk.text) {
                    accumulatedContent += chunk.text;
                    
                    // Send chunk update
                    sendMessage({
                      type: 'paragraph_chunk',
                      data: {
                        id: paragraphInfo.id,
                        content: accumulatedContent
                      }
                    });
                  }
                }

                // Send paragraph completion
                const completeParagraph = {
                  id: paragraphInfo.id,
                  title: paragraphInfo.title,
                  content: accumulatedContent,
                  order: paragraphInfo.order,
                  sectionId: section.id,
                  isStreaming: false
                };
                
                sendMessage({ type: 'paragraph_complete', data: completeParagraph });
                console.log(`✅ [Streaming API] Completed streaming paragraph: "${paragraphInfo.title}" (${section.id})`);
                
              } catch (error) {
                console.warn(`⚠️ [Streaming API] Error generating paragraph: "${paragraphInfo.title}"`, error);
                
                // Send error completion for this paragraph
                sendMessage({ 
                  type: 'paragraph_complete', 
                  data: {
                    id: paragraphInfo.id,
                    title: paragraphInfo.title,
                    content: `Error generating content for "${paragraphInfo.title}". Please try again.`,
                    order: paragraphInfo.order,
                    sectionId: section.id,
                    isStreaming: false,
                    hasError: true
                  }
                });
              }
              
              // Small delay between paragraphs to prevent overwhelming
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`🎯 [Streaming API] Completed section "${sectionTitle}" with ${section.paragraphs.length} paragraphs`);
            
            // Brief pause between sections
            if (i < metadata.sectionTitles.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          // Step 3: Send completion message
          const totalParagraphs = sections.reduce((acc, s) => acc + s.paragraphs.length, 0);
          sendMessage({ type: 'complete', data: { 
            totalSections: sections.length,
            totalParagraphs: totalParagraphs
          }});
          console.log(`🎉 [Streaming API] Content generation complete for: "${topic}" - ${sections.length} sections, ${totalParagraphs} paragraphs`);

        } catch (error) {
          console.error('❌ [Streaming API] Error during content generation:', error);
          sendMessage({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error during content generation'
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ [Streaming API] Error setting up stream:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to start content generation stream',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
