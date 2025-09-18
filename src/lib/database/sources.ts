/**
 * Sources Service
 * Handles source tracking and credibility management
 */

import { supabase, dbHelpers, type Database } from './supabase.js';

type Source = Database['public']['Tables']['sources']['Row'];
type SourceInsert = Database['public']['Tables']['sources']['Insert'];
type SourceUpdate = Database['public']['Tables']['sources']['Update'];

export class SourcesService {
  /**
   * Save a source with credibility assessment
   */
  static async saveSource(
    topicId: string,
    url: string,
    title: string,
    credibilityScore: number
  ): Promise<Source> {
    try {
      // Validate credibility score
      if (credibilityScore < 0 || credibilityScore > 10) {
        throw new Error('Credibility score must be between 0 and 10');
      }

      const sourceData: SourceInsert = {
        id: dbHelpers.generateId(),
        topic_id: topicId,
        url: url.trim(),
        title: title.trim(),
        credibility_score: credibilityScore
      };

      const { data, error } = await supabase
        .from('sources')
        .insert(sourceData)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('Saved source:', data.id, title);
      return data;
    } catch (error) {
      console.error('Failed to save source:', error);
      throw error;
    }
  }

  /**
   * Update credibility score for a source
   */
  static async updateCredibilityScore(
    sourceId: string,
    credibilityScore: number
  ): Promise<Source | null> {
    try {
      if (credibilityScore < 0 || credibilityScore > 10) {
        throw new Error('Credibility score must be between 0 and 10');
      }

      const { data, error } = await supabase
        .from('sources')
        .update({ credibility_score: credibilityScore })
        .eq('id', sourceId)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('Updated credibility score for source:', sourceId);
      return data;
    } catch (error) {
      console.error('Failed to update credibility score:', error);
      throw error;
    }
  }

  /**
   * Get all sources for a topic
   */
  static async getSourcesByTopic(topicId: string): Promise<Source[]> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('topic_id', topicId)
        .order('credibility_score', { ascending: false });

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get sources by topic:', error);
      return [];
    }
  }

  /**
   * Get high-credibility sources for a topic (score >= 7)
   */
  static async getHighCredibilitySources(topicId: string): Promise<Source[]> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('topic_id', topicId)
        .gte('credibility_score', 7)
        .order('credibility_score', { ascending: false });

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get high credibility sources:', error);
      return [];
    }
  }

  /**
   * Validate and score source credibility
   * This is a basic implementation - in production you'd want more sophisticated analysis
   */
  static validateSourceUrl(url: string): {
    isValid: boolean;
    estimatedCredibility: number;
    factors: string[];
    warnings: string[];
  } {
    const factors: string[] = [];
    const warnings: string[] = [];
    let credibilityScore = 5; // Start with neutral score

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Check for HTTPS
      if (urlObj.protocol === 'https:') {
        factors.push('Secure HTTPS connection');
        credibilityScore += 0.5;
      } else {
        warnings.push('Not using secure HTTPS');
        credibilityScore -= 1;
      }

      // Check for known high-credibility domains
      const highCredibilityDomains = [
        'wikipedia.org',
        'britannica.com',
        'nature.com',
        'sciencedirect.com',
        'pubmed.ncbi.nlm.nih.gov',
        'scholar.google.com',
        'arxiv.org',
        'gov',
        'edu'
      ];

      const isHighCredibilityDomain = highCredibilityDomains.some(d => 
        domain.includes(d) || domain.endsWith(`.${d}`)
      );

      if (isHighCredibilityDomain) {
        factors.push('From high-credibility domain');
        credibilityScore += 2;
      }

      // Check for academic/government domains
      if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
        factors.push('Academic or government domain');
        credibilityScore += 1.5;
      }

      // Check for potentially low-credibility indicators
      const lowCredibilityIndicators = [
        'blog',
        'wordpress',
        'blogspot',
        'medium.com',
        'reddit.com',
        'quora.com'
      ];

      const hasLowCredibilityIndicator = lowCredibilityIndicators.some(d => 
        domain.includes(d)
      );

      if (hasLowCredibilityIndicator) {
        warnings.push('May be user-generated content');
        credibilityScore -= 1;
      }

      // Check for suspicious patterns
      if (domain.split('.').length > 3) {
        warnings.push('Complex subdomain structure');
        credibilityScore -= 0.5;
      }

      // Ensure score is within bounds
      credibilityScore = Math.max(0, Math.min(10, credibilityScore));

      return {
        isValid: true,
        estimatedCredibility: credibilityScore,
        factors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        estimatedCredibility: 0,
        factors: [],
        warnings: ['Invalid URL format']
      };
    }
  }

  /**
   * Get source by ID
   */
  static async getSourceById(sourceId: string): Promise<Source | null> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        dbHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      console.error('Failed to get source by ID:', error);
      return null;
    }
  }

  /**
   * Search sources by URL or title
   */
  static async searchSources(query: string, limit: number = 20): Promise<Source[]> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .or(`url.ilike.%${query}%,title.ilike.%${query}%`)
        .order('credibility_score', { ascending: false })
        .limit(limit);

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to search sources:', error);
      return [];
    }
  }

  /**
   * Get credibility distribution for a topic
   */
  static async getCredibilityDistribution(topicId: string) {
    try {
      const sources = await this.getSourcesByTopic(topicId);
      
      const distribution = {
        high: sources.filter(s => s.credibility_score >= 7).length,
        medium: sources.filter(s => s.credibility_score >= 4 && s.credibility_score < 7).length,
        low: sources.filter(s => s.credibility_score < 4).length,
        average: sources.length > 0 
          ? sources.reduce((sum, s) => sum + s.credibility_score, 0) / sources.length 
          : 0
      };

      return {
        topic_id: topicId,
        total_sources: sources.length,
        distribution,
        top_sources: sources.slice(0, 5) // Top 5 most credible
      };
    } catch (error) {
      console.error('Failed to get credibility distribution:', error);
      return null;
    }
  }

  /**
   * Delete a source
   */
  static async deleteSource(sourceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', sourceId);

      if (error) dbHelpers.handleError(error);

      console.log('Deleted source:', sourceId);
      return true;
    } catch (error) {
      console.error('Failed to delete source:', error);
      return false;
    }
  }

  /**
   * Get trending domains (most frequently used)
   */
  static async getTrendingDomains(limit: number = 10): Promise<Array<{ domain: string; count: number; avg_credibility: number }>> {
    try {
      const { data: sources, error } = await supabase
        .from('sources')
        .select('url, credibility_score');

      if (error) dbHelpers.handleError(error);

      if (!sources) return [];

      // Extract domains and calculate statistics
      const domainStats: Record<string, { count: number; total_credibility: number }> = {};

      sources.forEach(source => {
        try {
          const domain = new URL(source.url).hostname;
          if (!domainStats[domain]) {
            domainStats[domain] = { count: 0, total_credibility: 0 };
          }
          domainStats[domain].count++;
          domainStats[domain].total_credibility += source.credibility_score;
        } catch {
          // Skip invalid URLs
        }
      });

      // Convert to array and sort by count
      const results = Object.entries(domainStats)
        .map(([domain, stats]) => ({
          domain,
          count: stats.count,
          avg_credibility: stats.total_credibility / stats.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('Failed to get trending domains:', error);
      return [];
    }
  }
}

export default SourcesService;
