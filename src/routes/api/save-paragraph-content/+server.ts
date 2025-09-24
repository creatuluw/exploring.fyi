/**
 * Save paragraph content to database
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParagraphsService } from '$lib/database/paragraphs.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { 
      paragraphId, 
      content, 
      summary, 
      metadata, 
      topicTitle, 
      chapterTitle 
    } = await request.json();
    
    if (!paragraphId || !content) {
      return json(
        { error: 'Missing required fields: paragraphId and content' },
        { status: 400 }
      );
    }
    
    console.log(`💾 [API] Saving paragraph content for: ${paragraphId}`);
    
    // Save the paragraph content
    const savedParagraph = await ParagraphsService.generateParagraphContent(
      paragraphId,
      content,
      {
        ...metadata,
        summary,
        syncedAt: new Date().toISOString(),
        syncSource: 'cache'
      }
    );
    
    if (!savedParagraph) {
      throw new Error('Failed to save paragraph content');
    }
    
    console.log(`✅ [API] Successfully saved paragraph: ${paragraphId}`);
    
    return json({
      success: true,
      data: {
        paragraphId: savedParagraph.id,
        saved: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [API] Save paragraph content failed:', error);
    return json(
      { 
        success: false,
        error: 'Failed to save paragraph content',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};
