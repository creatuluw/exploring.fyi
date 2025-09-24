/**
 * Source Tracking and Reference System
 * Automatically extracts, validates, and stores sources from AI-generated content
 */

import { SourcesService } from '$lib/database/sources.js';
import type { ContentPage } from '$lib/types/genkit.js';

interface ExtractedSource {
  url: string;
  title: string;
  type: 'article' | 'documentation' | 'research' | 'book' | 'video' | 'course';
  context: string; // Where it was mentioned in content
  credibilityScore: number;
  extractedAt: string;
}

interface SourceReference {
  sourceId: string;
  contentSection: string;
  citationText: string;
  relevanceScore: number;
}

export class SourceTracker {
  /**
   * Extract sources from AI-generated content
   */
  static extractSourcesFromContent(content: ContentPage): ExtractedSource[] {
    const sources: ExtractedSource[] = [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    
    // Extract from all content sections
    const allText = [
      content.overview,
      ...content.sections.map(s => s.content),
      ...content.sections.flatMap(s => s.examples),
      ...content.practicalSteps.map(s => s.explanation),
      ...content.commonQuestions.map(q => q.answer)
    ].join(' ');

    // Find all URLs
    const urls = allText.match(urlRegex) || [];
    
    // Validate and score each URL
    urls.forEach(url => {
      try {
        const validation = SourcesService.validateSourceUrl(url);
        if (validation.isValid) {
          // Extract title from context (simplified)
          const title = this.extractTitleFromContext(url, allText);
          
          sources.push({
            url: url.trim(),
            title: title || new URL(url).hostname,
            type: this.classifySourceType(url),
            context: this.extractContext(url, allText),
            credibilityScore: validation.estimatedCredibility,
            extractedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn('Failed to process URL:', url, error);
      }
    });

    // Also extract from referenced materials (if AI mentions specific sources)
    const referencePatterns = [
      /according to ([^,]+)/gi,
      /source: ([^,\n]+)/gi,
      /reference: ([^,\n]+)/gi,
      /study by ([^,]+)/gi,
      /research from ([^,]+)/gi
    ];

    referencePatterns.forEach(pattern => {
      const matches = allText.match(pattern) || [];
      matches.forEach(match => {
        const reference = match.replace(pattern, '$1').trim();
        if (reference && !sources.find(s => s.title.includes(reference))) {
          sources.push({
            url: '', // No direct URL
            title: reference,
            type: 'research',
            context: match,
            credibilityScore: 7, // Default for referenced research
            extractedAt: new Date().toISOString()
          });
        }
      });
    });

    return sources;
  }

  /**
   * Save sources to database and link with topic
   */
  static async saveSourcesForTopic(topicId: string, content: ContentPage): Promise<string[]> {
    try {
      const extractedSources = this.extractSourcesFromContent(content);
      const savedSourceIds: string[] = [];

      for (const source of extractedSources) {
        if (source.url) { // Only save sources with URLs
          try {
            const savedSource = await SourcesService.saveSource(
              topicId,
              source.url,
              source.title,
              source.credibilityScore
            );
            savedSourceIds.push(savedSource.id);
            console.log(`💾 [Sources] Saved source: ${source.title}`);
          } catch (error) {
            console.warn('Failed to save source:', source.title, error);
          }
        }
      }

      console.log(`✅ [Sources] Saved ${savedSourceIds.length} sources for topic: ${topicId}`);
      return savedSourceIds;

    } catch (error) {
      console.error('Failed to save sources for topic:', error);
      return [];
    }
  }

  /**
   * Get sources with credibility analysis for a topic
   */
  static async getTopicSourcesWithAnalysis(topicId: string) {
    try {
      const sources = await SourcesService.getSourcesByTopic(topicId);
      const distribution = await SourcesService.getCredibilityDistribution(topicId);

      return {
        sources,
        credibilityAnalysis: distribution,
        recommendations: this.generateSourceRecommendations(sources)
      };
    } catch (error) {
      console.error('Failed to get topic sources with analysis:', error);
      return null;
    }
  }

  /**
   * Generate source credibility recommendations
   */
  private static generateSourceRecommendations(sources: any[]): string[] {
    const recommendations: string[] = [];
    const highCredCount = sources.filter(s => s.credibility_score >= 8).length;
    const lowCredCount = sources.filter(s => s.credibility_score < 5).length;
    const totalSources = sources.length;

    if (totalSources === 0) {
      recommendations.push('No sources found. Consider adding authoritative references.');
    } else {
      if (lowCredCount > totalSources * 0.3) {
        recommendations.push('⚠️ Many sources have low credibility scores. Verify information independently.');
      }
      
      if (highCredCount === 0) {
        recommendations.push('💡 Consider finding peer-reviewed or official sources for better credibility.');
      } else if (highCredCount > totalSources * 0.7) {
        recommendations.push('✅ Excellent source credibility - most sources are highly reliable.');
      }

      if (totalSources < 3) {
        recommendations.push('📚 Limited sources available. Additional research may provide more perspectives.');
      }
    }

    return recommendations;
  }

  /**
   * Extract context around a URL mention
   */
  private static extractContext(url: string, fullText: string): string {
    const index = fullText.indexOf(url);
    if (index === -1) return '';

    const start = Math.max(0, index - 100);
    const end = Math.min(fullText.length, index + url.length + 100);
    
    return fullText.substring(start, end).trim();
  }

  /**
   * Extract title from surrounding text
   */
  private static extractTitleFromContext(url: string, fullText: string): string {
    const context = this.extractContext(url, fullText);
    
    // Try to find title patterns before the URL
    const titlePatterns = [
      /["']([^"']+)["']\s*\([^)]*\)/,
      /\*\*([^*]+)\*\*/,
      /\[([^\]]+)\]/,
      /([A-Z][^.!?]*)[.!?]\s*http/
    ];

    for (const pattern of titlePatterns) {
      const match = context.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Classify source type based on URL
   */
  private static classifySourceType(url: string): ExtractedSource['type'] {
    const domain = new URL(url).hostname.toLowerCase();

    if (domain.includes('wikipedia') || domain.includes('britannica')) {
      return 'article';
    }
    if (domain.includes('docs.') || domain.includes('documentation')) {
      return 'documentation';
    }
    if (domain.includes('arxiv') || domain.includes('pubmed') || domain.includes('scholar')) {
      return 'research';
    }
    if (domain.includes('youtube') || domain.includes('vimeo')) {
      return 'video';
    }
    if (domain.includes('course') || domain.includes('udemy') || domain.includes('coursera')) {
      return 'course';
    }
    if (domain.includes('amazon') && url.includes('/dp/')) {
      return 'book';
    }

    return 'article'; // Default
  }

  /**
   * Create citation text for a source
   */
  static createCitation(source: any, style: 'apa' | 'mla' | 'chicago' = 'apa'): string {
    const date = new Date(source.created_at).getFullYear();
    
    switch (style) {
      case 'apa':
        return `${source.title}. Retrieved ${date} from ${source.url}`;
      case 'mla':
        return `"${source.title}." Web. ${date}. <${source.url}>`;
      case 'chicago':
        return `"${source.title}." Accessed ${date}. ${source.url}`;
      default:
        return `${source.title} - ${source.url}`;
    }
  }

  /**
   * Search sources across all topics
   */
  static async searchAllSources(query: string, limit: number = 20) {
    try {
      return await SourcesService.searchSources(query, limit);
    } catch (error) {
      console.error('Failed to search sources:', error);
      return [];
    }
  }
}

export default SourceTracker;
