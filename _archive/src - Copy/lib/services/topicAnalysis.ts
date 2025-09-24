/**
 * Topic Analysis Service
 * Handles AI-powered topic analysis and concept expansion via API calls
 */

import type { TopicBreakdown, ConceptExpansion } from '../types/index.js';
import { calculateSafeRadius, getOptimalHandles } from '../utils/index.js';

// Types for streaming analysis
export interface StreamingNodeData {
  nodes: any[];
  edges: any[];
  isComplete: boolean;
  currentStep: string;
}

export interface StreamingCallback {
  (data: StreamingNodeData): void;
}

/**
 * Streaming version of topic analysis that progressively builds the mind map
 */
export async function analyzeTopicStreaming(
  topic: string,
  onProgress: StreamingCallback,
  language?: string,
  abortSignal?: AbortSignal
): Promise<void> {
  console.log(`🔍 [AI Streaming] Starting progressive topic analysis for: "${topic}"`);
  
  try {
    // Step 1: Show initial center node immediately
    const centerNode = {
      id: 'main',
      type: 'topicNode',
      position: { x: 400, y: 300 },
      data: {
        label: topic,
        description: `Analyzing ${topic}...`,
        level: 0,
        expandable: true,
        isMainTopic: true,
        isLoading: true
      }
    };

    onProgress({
      nodes: [centerNode],
      edges: [],
      isComplete: false,
      currentStep: 'Analyzing topic structure...'
    });

    console.log(`🤖 [AI Streaming] Connecting to streaming API...`);

    const response = await fetch('/api/analyze-topic-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, language }),
      signal: abortSignal
    });

    if (!response.ok || !response.body) {
      const details = await response.text();
      throw new Error(details || 'Streaming API request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedNodes: any[] = [centerNode];
    let accumulatedEdges: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        const payload = JSON.parse(line.slice(6));

        switch (payload.type) {
          case 'metadata': {
            const updatedCenterNode = {
              ...centerNode,
              data: {
                ...centerNode.data,
                description: payload.data.description || centerNode.data.description,
                difficulty: payload.data.difficulty,
                estimatedTime: payload.data.estimatedTime,
                isLoading: false
              }
            };
            accumulatedNodes = [updatedCenterNode];
            accumulatedEdges = [];
            onProgress({
              nodes: [...accumulatedNodes],
              edges: [...accumulatedEdges],
              isComplete: false,
              currentStep: 'Building concept nodes...'
            });
            break;
          }
          case 'aspects_batch': {
            const currentNodes: any[] = [];
            const currentEdges: any[] = [];
            // Include latest nodes from previous progress if needed by consumer
            // Compute deterministic positions for batch
            const aspects = payload.data as Array<any>;
            const numNodes = aspects.length;
            aspects.forEach((aspect: any, i: number) => {
              const baseAngle = (i / Math.max(numNodes, 1)) * 2 * Math.PI;
              const nodeWidth = 256;
              const minRadius = calculateSafeRadius(numNodes, nodeWidth, 100, 320);
              const radiusVariation = aspect.importance === 'high' ? -20 : aspect.importance === 'low' ? 20 : 0;
              const radius = minRadius + radiusVariation;
              const x = 400 + Math.cos(baseAngle) * radius;
              const y = 300 + Math.sin(baseAngle) * radius;
              const nodeId = `concept-${aspect.name}-${x.toFixed(0)}-${y.toFixed(0)}`;

              currentNodes.push({
                id: nodeId,
                type: 'conceptNode',
                position: { x, y },
                data: {
                  label: aspect.name,
                  description: aspect.description,
                  level: 1,
                  expandable: true,
                  importance: aspect.importance,
                  connections: aspect.connections,
                  parentId: 'main'
                }
              });

              const { sourceHandle, targetHandle } = getOptimalHandles(baseAngle);
              currentEdges.push({
                id: `edge-main-${nodeId}`,
                source: 'main',
                target: nodeId,
                sourceHandle,
                targetHandle,
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#6b7280', strokeWidth: 2 }
              });
            });

            // accumulate
            accumulatedNodes = [
              ...accumulatedNodes.filter(n => n.id === 'main'),
              ...accumulatedNodes.filter(n => n.id !== 'main'),
              ...currentNodes
            ];
            accumulatedEdges = [...accumulatedEdges, ...currentEdges];

            onProgress({
              nodes: [...accumulatedNodes],
              edges: [...accumulatedEdges],
              isComplete: false,
              currentStep: `Added ${currentNodes.length} concepts...`
            });
            break;
          }
          case 'complete': {
            onProgress({ nodes: [...accumulatedNodes], edges: [...accumulatedEdges], isComplete: true, currentStep: 'Mind map complete!' });
            break;
          }
          case 'error': {
            throw new Error(payload.data?.message || 'Streaming error');
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ [AI Streaming] Error in progressive analysis:`, error);
    
    // Show error state
    onProgress({
      nodes: [{
        id: 'main',
        type: 'topicNode',
        position: { x: 400, y: 300 },
        data: {
          label: topic,
          description: `Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
          level: 0,
          expandable: false,
          isMainTopic: true,
          error: true
        }
      }],
      edges: [],
      isComplete: true,
      currentStep: 'Analysis failed'
    });
    
    throw error;
  }
}

/**
 * Analyzes a topic and breaks it down into key concepts and learning path
 */
export async function analyzeTopic(topic: string, language?: string): Promise<TopicBreakdown> {
  console.log(`🔍 [AI] Starting topic analysis for: "${topic}"`);
  
  try {
    console.log(`🤖 [AI] Sending request to API server...`);
    
    const response = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, language }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [AI] No data received from API for topic: "${topic}"`);
      throw new Error('No data received from API');
    }

    console.log(`✅ [AI] Successfully analyzed topic: "${topic}"`);
    console.log(`📊 [AI] Generated breakdown with ${result.data.keyAspects.length} key aspects`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [AI] Error analyzing topic "${topic}":`, error);
    throw new Error(`Failed to analyze topic "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Expands a specific concept with detailed sub-concepts and resources
 */
export async function expandConcept(concept: string, parentTopic?: string, language?: string): Promise<ConceptExpansion> {
  console.log(`🔍 [AI] Starting concept expansion for: "${concept}"${parentTopic ? ` (in context of "${parentTopic}")` : ''}`);
  
  try {
    console.log(`🤖 [AI] Sending concept expansion request to API server...`);
    
    const response = await fetch('/api/expand-concept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ concept, parentTopic, language }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [AI] No data received from API for concept: "${concept}"`);
      throw new Error('No data received from API');
    }

    console.log(`✅ [AI] Successfully expanded concept: "${concept}"`);
    console.log(`📊 [AI] Generated ${result.data.subConcepts.length} sub-concepts`);
    
    return result.data;
  } catch (error) {
    console.error(`❌ [AI] Error expanding concept "${concept}":`, error);
    throw new Error(`Failed to expand concept "${concept}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates initial mind map data structure from topic breakdown
 */
export function createMindMapFromBreakdown(breakdown: TopicBreakdown): any {
  const centerNode = {
    id: 'main',
    type: 'topicNode',
    position: { x: 400, y: 300 },
    data: {
      label: breakdown.mainTopic,
      description: breakdown.description,
      level: 0,
      expandable: true,
      isMainTopic: true,
      difficulty: breakdown.difficulty,
      estimatedTime: breakdown.estimatedTime
    }
  };

  const conceptNodes = breakdown.keyAspects.map((aspect, index) => {
    // Calculate positions in a circular layout with better spacing
    const numNodes = breakdown.keyAspects.length;
    const baseAngle = (index / numNodes) * 2 * Math.PI;
    
    // Calculate safe radius to prevent node overlaps
    const nodeWidth = 256; // ConceptNode max-width + padding
    const minRadius = calculateSafeRadius(numNodes, nodeWidth, 100, 320);
    
    // Vary radius slightly based on importance but maintain good spacing
    const radiusVariation = (aspect.importance === 'high') ? -20 : 
                           (aspect.importance === 'low') ? 20 : 0;
    const radius = minRadius + radiusVariation;
    
    // Position nodes in a circle around the center (400, 300)
    const x = 400 + Math.cos(baseAngle) * radius;
    const y = 300 + Math.sin(baseAngle) * radius;

    return {
      id: `concept-${index}`,
      type: 'conceptNode',
      position: { x, y },
      data: {
        label: aspect.name,
        description: aspect.description,
        level: 1,
        expandable: true,
        importance: aspect.importance,
        connections: aspect.connections,
        parentId: 'main'
      }
    };
  });

  const edges = breakdown.keyAspects.map((aspect, index) => {
    const numNodes = breakdown.keyAspects.length;
    const baseAngle = (index / numNodes) * 2 * Math.PI;
    
    // Get optimal connection handles based on node position
    const { sourceHandle, targetHandle } = getOptimalHandles(baseAngle);

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
 * Creates nodes for expanded concept
 */
export function createExpandedConceptNodes(
  conceptId: string, 
  expansion: ConceptExpansion, 
  parentPosition: { x: number; y: number }
): { nodes: any[]; edges: any[] } {
  const nodes = expansion.subConcepts.map((subConcept, index) => {
    // Position sub-concepts in a circle around the parent with better spacing
    const numSubNodes = expansion.subConcepts.length;
    const angle = (index / numSubNodes) * 2 * Math.PI;
    
    // Calculate safe radius for sub-concepts to prevent overlap
    const nodeWidth = 256; // ConceptNode max-width + padding
    const baseRadius = calculateSafeRadius(numSubNodes, nodeWidth, 60, 180);
    const x = parentPosition.x + Math.cos(angle) * baseRadius;
    const y = parentPosition.y + Math.sin(angle) * baseRadius;

    return {
      id: `${conceptId}-sub-${index}`,
      type: 'conceptNode',
      position: { x, y },
      data: {
        label: subConcept.name,
        description: subConcept.description,
        level: 2,
        expandable: false,
        examples: subConcept.examples,
        relatedTo: subConcept.relatedTo,
        difficulty: subConcept.difficulty,
        parentId: conceptId
      }
    };
  });

  const edges = expansion.subConcepts.map((_, index) => {
    const numSubNodes = expansion.subConcepts.length;
    const angle = (index / numSubNodes) * 2 * Math.PI;
    
    // Get optimal connection handles based on node position
    const { sourceHandle, targetHandle } = getOptimalHandles(angle);

    return {
      id: `edge-${conceptId}-${index}`,
      source: conceptId,
      target: `${conceptId}-sub-${index}`,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#9ca3af', strokeWidth: 1.5 }
    };
  });

  return { nodes, edges };
}

/**
 * Streaming version for URL analysis 
 */
export async function analyzeUrlStreaming(
  url: string,
  onProgress: StreamingCallback,
  language?: string,
  abortSignal?: AbortSignal
): Promise<void> {
  console.log(`🔍 [AI Streaming] Starting progressive URL analysis for: "${url}"`);
  
  try {
    // Import URL analysis functions
    const { analyzeUrl, validateUrl } = await import('./urlAnalysis.js');
    
    // Step 1: Show initial center node immediately
    const domain = new URL(url).hostname;
    const centerNode = {
      id: 'main',
      type: 'topicNode',
      position: { x: 400, y: 300 },
      data: {
        label: `Content from ${domain}`,
        description: `Analyzing content from ${url}...`,
        level: 0,
        expandable: true,
        isMainTopic: true,
        sourceUrl: url,
        isLoading: true
      }
    };

    onProgress({
      nodes: [centerNode],
      edges: [],
      isComplete: false,
      currentStep: 'Validating URL and fetching content...'
    });

    // Step 2: Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid URL');
    }

    onProgress({
      nodes: [centerNode],
      edges: [],
      isComplete: false,
      currentStep: 'Extracting and analyzing content...'
    });

    console.log(`✅ [AI Streaming] Connecting to streaming API for URL...`);
    const response = await fetch('/api/analyze-url-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, language }),
      signal: abortSignal
    });
    if (!response.ok || !response.body) {
      const details = await response.text();
      throw new Error(details || 'Streaming API request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        const payload = JSON.parse(line.slice(6));
        switch (payload.type) {
          case 'metadata': {
            const updatedCenterNode = {
              ...centerNode,
              data: {
                ...centerNode.data,
                label: payload.data.title || centerNode.data.label,
                description: payload.data.summary || centerNode.data.description,
                difficulty: payload.data.difficulty,
                domain: payload.data.domain,
                contentType: payload.data.contentType,
                credibility: payload.data.credibility,
                isLoading: false
              }
            };
            onProgress({ nodes: [updatedCenterNode], edges: [], isComplete: false, currentStep: 'Building concept nodes...' });
            break;
          }
          case 'concepts_batch': {
            const concepts = payload.data as Array<any>;
            const nodes: any[] = [];
            const edges: any[] = [];
            const numNodes = concepts.length;
            concepts.forEach((concept: any, i: number) => {
              const angle = (i / Math.max(numNodes, 1)) * 2 * Math.PI;
              const nodeWidth = 256;
              const minRadius = calculateSafeRadius(numNodes, nodeWidth, 80, 280);
              const x = 400 + Math.cos(angle) * minRadius;
              const y = 300 + Math.sin(angle) * minRadius;
              const nodeId = `concept-${concept.name}-${x.toFixed(0)}-${y.toFixed(0)}`;
              nodes.push({
                id: nodeId,
                type: 'conceptNode',
                position: { x, y },
                data: {
                  label: concept.name,
                  description: concept.description,
                  level: 1,
                  expandable: true,
                  importance: concept.importance,
                  parentId: 'main',
                  sourceUrl: url
                }
              });
              const { sourceHandle, targetHandle } = getOptimalHandles(angle);
              edges.push({ id: `edge-main-${nodeId}`, source: 'main', target: nodeId, sourceHandle, targetHandle, type: 'smoothstep', animated: false, style: { stroke: '#6b7280', strokeWidth: 2 } });
            });
            onProgress({ nodes: [{ ...centerNode, data: { ...centerNode.data, isLoading: false } }, ...nodes], edges, isComplete: false, currentStep: `Added ${nodes.length} concepts...` });
            break;
          }
          case 'complete':
            onProgress({ nodes: [], edges: [], isComplete: true, currentStep: 'Mind map complete!' });
            break;
          case 'error':
            throw new Error(payload.data?.message || 'Streaming error');
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ [AI Streaming] Error in progressive URL analysis:`, error);
    
    // Show error state
    const domain = new URL(url).hostname;
    onProgress({
      nodes: [{
        id: 'main',
        type: 'topicNode',
        position: { x: 400, y: 300 },
        data: {
          label: `Content from ${domain}`,
          description: `Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`,
          level: 0,
          expandable: false,
          isMainTopic: true,
          sourceUrl: url,
          error: true
        }
      }],
      edges: [],
      isComplete: true,
      currentStep: 'Analysis failed'
    });
    
    throw error;
  }
}
