/**
 * Check if paragraph exists in database
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParagraphsService } from '$lib/database/paragraphs.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { paragraphId } = await request.json();
    
    if (!paragraphId) {
      return json(
        { error: 'Missing paragraphId' },
        { status: 400 }
      );
    }
    
    const paragraph = await ParagraphsService.getParagraphById(paragraphId);
    
    return json({
      success: true,
      exists: !!paragraph,
      isGenerated: paragraph?.isGenerated || false
    });
    
  } catch (error) {
    console.error('❌ [API] Check paragraph exists failed:', error);
    return json(
      { 
        success: false,
        error: 'Failed to check paragraph existence',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
};
