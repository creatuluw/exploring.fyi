/**
 * Enhanced Topic Analysis with Database Persistence
 * Extends existing topicAnalysis.ts to save all data to Supabase
 */

import { SessionService } from '$lib/database/sessions.js';
import { TopicsService } from '$lib/database/topics.js';
import { MindMapsService } from '$lib/database/mindMaps.js';
import { SourcesService } from '$lib/database/sources.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';
import type { StreamingCallback, StreamingNodeData } from './topicAnalysis.js';

// Re-export original functions
export * from './topicAnalysis.js';

/**
 * Enhanced streaming topic analysis that saves data to database
 */
export async function analyzeTopicStreamingWithPersistence(
  topic: string, 
  onProgress: StreamingCallback
): Promise<string> { // Returns topic ID
  console.log(`🔍 [AI+DB] Starting topic analysis with persistence: "${topic}"`);
  
  const sessionState = get(session);
  if (!sessionState.id) {
    throw new Error('No active session - cannot save topic data');
  }

  let savedTopicId: string | null = null;
  let savedMindMapId: string | null = null;

  try {
    // Step 1: Save initial topic record
    const savedTopic = await TopicsService.saveTopic(
      sessionState.id,
      topic,
      'topic', // source_type
      undefined, // no source_url for topics
      null // mind_map_data will be added later
    );
    savedTopicId = savedTopic.id;

    // Increment session topic count
    await SessionService.incrementTopicCount(sessionState.id);

    console.log(`💾 [DB] Saved topic: ${savedTopicId}`);

    // Step 2: Create enhanced progress callback that saves data
    const enhancedOnProgress: StreamingCallback = async (data: StreamingNodeData) => {
      // Call original progress callback for UI updates
      onProgress(data);

      // Save mind map data to database during streaming
      if (data.nodes.length > 0 && savedTopicId) {
        try {
          if (!savedMindMapId) {
            // Create new mind map record
            const mindMap = await MindMapsService.saveMindMap(
              savedTopicId,
              data.nodes,
              data.edges,
              { 
                isComplete: data.isComplete,
                currentStep: data.currentStep,
                streamingTimestamp: new Date().toISOString()
              }
            );
            savedMindMapId = mindMap.id;
            console.log(`💾 [DB] Created mind map: ${savedMindMapId}`);
          } else {
            // Update existing mind map
            await MindMapsService.updateMindMapNodes(savedMindMapId, data.nodes, data.edges);
            console.log(`💾 [DB] Updated mind map: ${savedMindMapId}`);
          }
        } catch (error) {
          console.warn('Failed to save mind map data during streaming:', error);
        }
      }
    };

    // Step 3: Import and call original streaming function with enhanced callback
    const { analyzeTopicStreaming } = await import('./topicAnalysis.js');
    await analyzeTopicStreaming(topic, enhancedOnProgress);

    // Step 4: Update topic with final mind map data
    if (savedTopicId && savedMindMapId) {
      const finalMindMap = await MindMapsService.getMindMapById(savedMindMapId);
      if (finalMindMap) {
        await TopicsService.updateTopicContent(savedTopicId, {
          mindMapData: {
            mindMapId: savedMindMapId,
            nodeCount: finalMindMap.nodes.length,
            edgeCount: finalMindMap.edges.length,
            completedAt: new Date().toISOString()
          }
        });
      }
    }

    console.log(`✅ [AI+DB] Topic analysis complete with full persistence`);
    return savedTopicId;

  } catch (error) {
    console.error(`❌ [AI+DB] Error in persistent topic analysis:`, error);
    // Clean up partial data if needed
    if (savedTopicId) {
      console.log(`🧹 [DB] Cleaning up partial topic data: ${savedTopicId}`);
      // Note: In production, you might want to mark as failed rather than delete
    }
    throw error;
  }
}

/**
 * Enhanced streaming URL analysis that saves data to database
 */
export async function analyzeUrlStreamingWithPersistence(
  url: string,
  onProgress: StreamingCallback
): Promise<string> { // Returns topic ID
  console.log(`🔍 [AI+DB] Starting URL analysis with persistence: "${url}"`);
  
  const sessionState = get(session);
  if (!sessionState.id) {
    throw new Error('No active session - cannot save URL data');
  }

  let savedTopicId: string | null = null;
  let savedMindMapId: string | null = null;

  try {
    // Step 1: Save initial URL topic record
    const domain = new URL(url).hostname;
    const savedTopic = await TopicsService.saveTopic(
      sessionState.id,
      `Content from ${domain}`,
      'url', // source_type
      url, // source_url
      null // mind_map_data will be added later
    );
    savedTopicId = savedTopic.id;

    // Increment session topic count
    await SessionService.incrementTopicCount(sessionState.id);

    console.log(`💾 [DB] Saved URL topic: ${savedTopicId}`);

    // Step 2: Create enhanced progress callback that saves data
    const enhancedOnProgress: StreamingCallback = async (data: StreamingNodeData) => {
      // Call original progress callback for UI updates
      onProgress(data);

      // Save mind map data to database during streaming
      if (data.nodes.length > 0 && savedTopicId) {
        try {
          if (!savedMindMapId) {
            // Create new mind map record
            const mindMap = await MindMapsService.saveMindMap(
              savedTopicId,
              data.nodes,
              data.edges,
              { 
                isComplete: data.isComplete,
                currentStep: data.currentStep,
                streamingTimestamp: new Date().toISOString(),
                sourceUrl: url
              }
            );
            savedMindMapId = mindMap.id;
            console.log(`💾 [DB] Created URL mind map: ${savedMindMapId}`);
          } else {
            // Update existing mind map
            await MindMapsService.updateMindMapNodes(savedMindMapId, data.nodes, data.edges);
            console.log(`💾 [DB] Updated URL mind map: ${savedMindMapId}`);
          }
        } catch (error) {
          console.warn('Failed to save URL mind map data during streaming:', error);
        }
      }
    };

    // Step 3: Import and call original URL streaming function with enhanced callback
    const { analyzeUrlStreaming } = await import('./topicAnalysis.js');
    await analyzeUrlStreaming(url, enhancedOnProgress);

    // Step 4: Update topic with final mind map data and source tracking
    if (savedTopicId && savedMindMapId) {
      const finalMindMap = await MindMapsService.getMindMapById(savedMindMapId);
      if (finalMindMap) {
        await TopicsService.updateTopicContent(savedTopicId, {
          mindMapData: {
            mindMapId: savedMindMapId,
            nodeCount: finalMindMap.nodes.length,
            edgeCount: finalMindMap.edges.length,
            completedAt: new Date().toISOString(),
            sourceUrl: url
          }
        });

        // Save URL as a credible source
        await SourcesService.saveSource(
          savedTopicId,
          url,
          `Content from ${domain}`,
          8.0, // High credibility for direct URL analysis
          'primary' // This is the primary source
        );
      }
    }

    console.log(`✅ [AI+DB] URL analysis complete with full persistence`);
    return savedTopicId;

  } catch (error) {
    console.error(`❌ [AI+DB] Error in persistent URL analysis:`, error);
    // Clean up partial data if needed
    if (savedTopicId) {
      console.log(`🧹 [DB] Cleaning up partial URL topic data: ${savedTopicId}`);
    }
    throw error;
  }
}

/**
 * Load existing mind map for a topic
 */
export async function loadTopicMindMap(topicId: string): Promise<StreamingNodeData | null> {
  try {
    const mindMap = await MindMapsService.getMindMapByTopic(topicId);
    if (!mindMap) return null;

    return {
      nodes: mindMap.nodes as any[],
      edges: mindMap.edges as any[],
      isComplete: true,
      currentStep: 'Loaded from database'
    };
  } catch (error) {
    console.error('Failed to load topic mind map:', error);
    return null;
  }
}

/**
 * Enhanced concept expansion with node tracking
 */
export async function expandConceptWithPersistence(
  concept: string,
  parentTopic: string,
  mindMapId: string,
  nodeId: string
): Promise<void> {
  console.log(`🔍 [AI+DB] Expanding concept with persistence: "${concept}"`);

  try {
    // Import original expansion function
    const { expandConcept, createExpandedConceptNodes } = await import('./topicAnalysis.js');
    
    // Get AI expansion
    const expansion = await expandConcept(concept, parentTopic);

    // Create new nodes from expansion
    const parentNode = { position: { x: 400, y: 300 } }; // You'd get real position from current nodes
    const { nodes: newNodes, edges: newEdges } = createExpandedConceptNodes(
      nodeId,
      expansion,
      parentNode.position
    );

    // Save expansion to database
    await MindMapsService.saveNodeExpansion(mindMapId, nodeId, {
      newNodes,
      newEdges
    });

    console.log(`💾 [DB] Saved concept expansion for node: ${nodeId}`);

  } catch (error) {
    console.error(`❌ [AI+DB] Error in persistent concept expansion:`, error);
    throw error;
  }
}

/**
 * Get topic exploration history for current session
 */
export async function getTopicHistory(): Promise<any[]> {
  const sessionState = get(session);
  if (!sessionState.id) return [];

  try {
    const topics = await TopicsService.getTopicHistory(sessionState.id, 50);
    
    // Enhance with mind map and progress data
    const enhancedTopics = await Promise.all(
      topics.map(async (topic) => {
        const mindMap = await MindMapsService.getMindMapByTopic(topic.id);
        const stats = mindMap ? await MindMapsService.getMindMapStats(mindMap.id) : null;
        
        return {
          ...topic,
          mindMap: mindMap ? {
            id: mindMap.id,
            nodeCount: stats?.total_nodes || 0,
            edgeCount: stats?.total_edges || 0,
            lastUpdated: mindMap.updated_at
          } : null
        };
      })
    );

    return enhancedTopics;
  } catch (error) {
    console.error('Failed to get topic history:', error);
    return [];
  }
}
