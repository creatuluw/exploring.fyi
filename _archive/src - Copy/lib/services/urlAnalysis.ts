/**
 * URL Analysis Service
 * Handles AI-powered analysis of web content from URLs via API calls
 */

import type { NewUrlAnalysis as UrlAnalysis } from '../types/index.js';
import { calculateSafeRadius, getOptimalHandles } from '../utils/index.js';

/**
 * Analyzes a URL and extracts key information for mind mapping
 */
export async function analyzeUrl(url: string, language?: string): Promise<UrlAnalysis> {
  console.log(`🔍 [AI] Starting URL analysis for: "${url}"`);
  
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid URL.');
    }
    
    console.log(`🤖 [AI] Sending URL analysis request to API server...`);
    
    const response = await fetch('/api/analyze-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, language }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [AI] No data received from API for URL: "${url}"`);
      throw new Error('No data received from API');
    }

    console.log(`✅ [AI] Successfully analyzed URL: "${url}"`);
    console.log(`📊 [AI] Generated analysis with ${result.data.concepts.length} key concepts`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [AI] Error analyzing URL "${url}":`, error);
    throw new Error(`Failed to analyze URL "${url}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches content from URL (when possible) for more detailed analysis
 * Note: This is a placeholder for content fetching functionality
 */
export async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    // In a browser environment, we're limited by CORS
    // This would typically be handled by a backend service
    
    // For now, return null to indicate content couldn't be fetched
    // The analysis will work with URL structure only
    console.warn('Content fetching not implemented - using URL structure analysis only');
    return null;
  } catch (error) {
    console.error('Error fetching URL content:', error);
    return null;
  }
}

/**
 * Creates mind map data structure from URL analysis
 */
export function createMindMapFromUrlAnalysis(analysis: UrlAnalysis, originalUrl: string): any {
  const centerNode = {
    id: 'main',
    type: 'topicNode',
    position: { x: 400, y: 300 },
    data: {
      label: analysis.title,
      description: analysis.summary,
      level: 0,
      expandable: true,
      isMainTopic: true,
      difficulty: analysis.difficulty,
      sourceUrl: originalUrl,
      domain: analysis.domain,
      contentType: analysis.contentType,
      credibility: analysis.credibility
    }
  };

  const conceptNodes = analysis.concepts.map((concept, index) => {
    const numNodes = analysis.concepts.length;
    const angle = (index / numNodes) * 2 * Math.PI;
    
    // Calculate safe radius to prevent node overlaps
    const nodeWidth = 256; // ConceptNode max-width + padding
    const minRadius = calculateSafeRadius(numNodes, nodeWidth, 80, 280);
    
    const x = 400 + Math.cos(angle) * minRadius;
    const y = 300 + Math.sin(angle) * minRadius;

    return {
      id: `concept-${index}`,
      type: 'conceptNode',
      position: { x, y },
      data: {
        label: concept.name,
        description: concept.description,
        level: 1,
        expandable: true,
        importance: concept.importance,
        parentId: 'main',
        sourceUrl: originalUrl
      }
    };
  });

  const edges = analysis.concepts.map((_, index) => {
    const numNodes = analysis.concepts.length;
    const angle = (index / numNodes) * 2 * Math.PI;
    
    // Get optimal connection handles based on node position
    const { sourceHandle, targetHandle } = getOptimalHandles(angle);
    
    return {
      id: `edge-main-${index}`,
      source: 'main',
      target: `concept-${index}`,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6b7280', strokeWidth: 2 }
    };
  });

  return {
    nodes: [centerNode, ...conceptNodes],
    edges
  };
}

/**
 * Validates URL format and accessibility
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const urlObj = new URL(url);
    
    // Check for supported protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        isValid: false, 
        error: 'Only HTTP and HTTPS URLs are supported' 
      };
    }
    
    // Check for localhost or private IPs (optional security check)
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.')) {
      return { 
        isValid: false, 
        error: 'Local and private network URLs are not supported' 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid URL format' 
    };
  }
}

/**
 * Extracts domain information for credibility assessment
 */
export function getDomainInfo(url: string): {
  domain: string;
  subdomain?: string;
  tld: string;
  isEducational: boolean;
  isGovernment: boolean;
  isOrganization: boolean;
} {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    const tld = parts[parts.length - 1];
    const domain = parts.length > 1 ? parts[parts.length - 2] : hostname;
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : undefined;
    
    return {
      domain,
      subdomain,
      tld,
      isEducational: tld === 'edu',
      isGovernment: tld === 'gov',
      isOrganization: tld === 'org'
    };
  } catch (error) {
    throw new Error('Invalid URL for domain extraction');
  }
}
