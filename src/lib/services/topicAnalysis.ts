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
  onProgress: StreamingCallback
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

    console.log(`🤖 [AI Streaming] Sending request to API server...`);
    
    // Step 2: Get full analysis from AI
    const response = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'API request failed');
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.error(`❌ [AI Streaming] No data received from API for topic: "${topic}"`);
      throw new Error('No data received from API');
    }

    const breakdown: TopicBreakdown = result.data;
    console.log(`✅ [AI Streaming] Analysis complete, building nodes progressively...`);

    // Step 3: Update center node with real data
    const updatedCenterNode = {
      ...centerNode,
      data: {
        ...centerNode.data,
        description: breakdown.description,
        difficulty: breakdown.difficulty,
        estimatedTime: breakdown.estimatedTime,
        isLoading: false
      }
    };

    onProgress({
      nodes: [updatedCenterNode],
      edges: [],
      isComplete: false,
      currentStep: 'Building concept nodes...'
    });

    // Step 4: Add nodes progressively with small delays for visual effect
    let currentNodes = [updatedCenterNode];
    let currentEdges: any[] = [];

    for (let i = 0; i < breakdown.keyAspects.length; i++) {
      const aspect = breakdown.keyAspects[i];
      
      // Calculate position for this concept node
      const numNodes = breakdown.keyAspects.length;
      const baseAngle = (i / numNodes) * 2 * Math.PI;
      const nodeWidth = 256;
      const minRadius = calculateSafeRadius(numNodes, nodeWidth, 100, 320);
      const radiusVariation = (aspect.importance === 'high') ? -20 : 
                             (aspect.importance === 'low') ? 20 : 0;
      const radius = minRadius + radiusVariation;
      const x = 400 + Math.cos(baseAngle) * radius;
      const y = 300 + Math.sin(baseAngle) * radius;

      // Create concept node
      const conceptNode = {
        id: `concept-${i}`,
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

      // Create edge to connect to center
      const { sourceHandle, targetHandle } = getOptimalHandles(baseAngle);
      const edge = {
        id: `edge-main-${i}`,
        source: 'main',
        target: `concept-${i}`,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6b7280', strokeWidth: 2 }
      };

      currentNodes.push(conceptNode);
      currentEdges.push(edge);

      // Emit progress with new node
      onProgress({
        nodes: [...currentNodes],
        edges: [...currentEdges],
        isComplete: false,
        currentStep: `Added "${aspect.name}" concept...`
      });

      // Small delay for visual streaming effect (only if not the last node)
      if (i < breakdown.keyAspects.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    // Step 5: Final completion
    onProgress({
      nodes: currentNodes,
      edges: currentEdges,
      isComplete: true,
      currentStep: 'Mind map complete!'
    });

    console.log(`🎉 [AI Streaming] Progressive analysis completed with ${currentNodes.length} nodes`);
    
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
export async function analyzeTopic(topic: string): Promise<TopicBreakdown> {
  console.log(`🔍 [AI] Starting topic analysis for: "${topic}"`);
  
  try {
    console.log(`🤖 [AI] Sending request to API server...`);
    
    const response = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
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
export async function expandConcept(concept: string, parentTopic?: string): Promise<ConceptExpansion> {
  console.log(`🔍 [AI] Starting concept expansion for: "${concept}"${parentTopic ? ` (in context of "${parentTopic}")` : ''}`);
  
  try {
    console.log(`🤖 [AI] Sending concept expansion request to API server...`);
    
    const response = await fetch('/api/expand-concept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ concept, parentTopic }),
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
  onProgress: StreamingCallback
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

    // Step 3: Get analysis from AI
    const analysis = await analyzeUrl(url);
    console.log(`✅ [AI Streaming] URL analysis complete, building nodes progressively...`);

    // Step 4: Update center node with real data
    const updatedCenterNode = {
      ...centerNode,
      data: {
        ...centerNode.data,
        label: analysis.title,
        description: analysis.summary,
        difficulty: analysis.difficulty,
        domain: analysis.domain,
        contentType: analysis.contentType,
        credibility: analysis.credibility,
        isLoading: false
      }
    };

    onProgress({
      nodes: [updatedCenterNode],
      edges: [],
      isComplete: false,
      currentStep: 'Building concept nodes...'
    });

    // Step 5: Add concept nodes progressively
    let currentNodes = [updatedCenterNode];
    let currentEdges: any[] = [];

    for (let i = 0; i < analysis.concepts.length; i++) {
      const concept = analysis.concepts[i];
      
      // Calculate position for this concept node
      const numNodes = analysis.concepts.length;
      const angle = (i / numNodes) * 2 * Math.PI;
      const nodeWidth = 256;
      const minRadius = calculateSafeRadius(numNodes, nodeWidth, 80, 280);
      const x = 400 + Math.cos(angle) * minRadius;
      const y = 300 + Math.sin(angle) * minRadius;

      // Create concept node
      const conceptNode = {
        id: `concept-${i}`,
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
      };

      // Create edge to connect to center
      const { sourceHandle, targetHandle } = getOptimalHandles(angle);
      const edge = {
        id: `edge-main-${i}`,
        source: 'main',
        target: `concept-${i}`,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6b7280', strokeWidth: 2 }
      };

      currentNodes.push(conceptNode);
      currentEdges.push(edge);

      // Emit progress with new node
      onProgress({
        nodes: [...currentNodes],
        edges: [...currentEdges],
        isComplete: false,
        currentStep: `Added "${concept.name}" concept...`
      });

      // Small delay for visual streaming effect (only if not the last node)
      if (i < analysis.concepts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    // Step 6: Final completion
    onProgress({
      nodes: currentNodes,
      edges: currentEdges,
      isComplete: true,
      currentStep: 'Mind map complete!'
    });

    console.log(`🎉 [AI Streaming] Progressive URL analysis completed with ${currentNodes.length} nodes`);
    
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
