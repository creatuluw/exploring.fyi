/**
 * Content Splitting Utilities
 * Split content into manageable paragraphs for better presentation and tracking
 */

export interface ContentParagraph {
  id: string;
  content: string;
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote';
  originalIndex: number;
}

/**
 * Split markdown content into logical paragraphs
 * Each paragraph represents a single concept or idea
 */
export function splitContentIntoParagraphs(content: string, sectionId: string): ContentParagraph[] {
  const paragraphs: ContentParagraph[] = [];
  
  // Split content by double line breaks (paragraph separators)
  const rawParagraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  rawParagraphs.forEach((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    
    if (trimmedParagraph.length === 0) return;
    
    // Determine paragraph type
    let type: ContentParagraph['type'] = 'paragraph';
    
    if (trimmedParagraph.startsWith('#')) {
      type = 'heading';
    } else if (trimmedParagraph.startsWith('```') || trimmedParagraph.includes('```')) {
      type = 'code';
    } else if (trimmedParagraph.startsWith('>')) {
      type = 'quote';
    } else if (trimmedParagraph.startsWith('-') || trimmedParagraph.startsWith('*') || trimmedParagraph.startsWith('1.')) {
      type = 'list';
    }
    
    // Generate unique paragraph ID
    const paragraphId = `${sectionId}-p${index + 1}`;
    
    paragraphs.push({
      id: paragraphId,
      content: trimmedParagraph,
      type,
      originalIndex: index
    });
  });
  
  return paragraphs;
}

/**
 * Combine multiple short paragraphs if they're too small
 * This helps avoid overly granular tracking for very short content
 */
export function optimizeParagraphSizes(paragraphs: ContentParagraph[], minLength: number = 100): ContentParagraph[] {
  const optimized: ContentParagraph[] = [];
  let currentCombined: ContentParagraph | null = null;
  
  for (const paragraph of paragraphs) {
    // Always keep headings, code blocks, and quotes separate
    if (paragraph.type !== 'paragraph' || paragraph.content.length >= minLength) {
      // Flush any accumulated content first
      if (currentCombined) {
        optimized.push(currentCombined);
        currentCombined = null;
      }
      optimized.push(paragraph);
    } else {
      // Combine short paragraphs
      if (currentCombined) {
        currentCombined.content += '\n\n' + paragraph.content;
      } else {
        currentCombined = { ...paragraph };
      }
      
      // If combined paragraph is now long enough, add it
      if (currentCombined.content.length >= minLength) {
        optimized.push(currentCombined);
        currentCombined = null;
      }
    }
  }
  
  // Add any remaining combined content
  if (currentCombined) {
    optimized.push(currentCombined);
  }
  
  return optimized;
}

/**
 * Main function to process content for paragraph display
 */
export function processContentForParagraphs(content: string, sectionId: string): ContentParagraph[] {
  const paragraphs = splitContentIntoParagraphs(content, sectionId);
  return optimizeParagraphSizes(paragraphs, 80); // Minimum 80 characters per paragraph
}

