/**
 * AI Integration Test
 * Tests the complete AI topic exploration pipeline
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Test configuration
const TEST_TOPIC = 'Machine Learning';
const API_BASE_URL = 'http://localhost:5173'; // Will be updated to match actual dev server

interface TopicBreakdown {
  mainTopic: string;
  description: string;
  keyAspects: Array<{
    name: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    connections: string[];
  }>;
  learningPath: Array<{
    step: number;
    concept: string;
    prerequisites: string[];
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

interface ConceptExpansion {
  concept: string;
  subConcepts: Array<{
    name: string;
    description: string;
    examples: string[];
    relatedTo: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  practicalApplications: string[];
  commonMisconceptions: string[];
  resources: Array<{
    type: 'article' | 'video' | 'book' | 'course' | 'documentation';
    title: string;
    url?: string;
    description: string;
  }>;
}

describe('AI Topic Exploration Integration', () => {
  let topicBreakdown: TopicBreakdown;
  
  beforeAll(() => {
    console.log('🧪 [TEST] Starting AI integration tests...');
  });

  it('should analyze a topic and return structured breakdown', async () => {
    console.log(`🎯 [TEST] Testing topic analysis for: "${TEST_TOPIC}"`);
    
    const response = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic: TEST_TOPIC }),
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    topicBreakdown = result.data;
    
    // Validate structure
    expect(topicBreakdown.mainTopic).toBe(TEST_TOPIC);
    expect(topicBreakdown.description).toBeDefined();
    expect(topicBreakdown.keyAspects).toBeInstanceOf(Array);
    expect(topicBreakdown.keyAspects.length).toBeGreaterThan(3);
    expect(topicBreakdown.learningPath).toBeInstanceOf(Array);
    expect(['beginner', 'intermediate', 'advanced']).toContain(topicBreakdown.difficulty);
    
    // Validate key aspects structure
    topicBreakdown.keyAspects.forEach(aspect => {
      expect(aspect.name).toBeDefined();
      expect(aspect.description).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(aspect.importance);
      expect(aspect.connections).toBeInstanceOf(Array);
    });
    
    // Validate learning path structure
    topicBreakdown.learningPath.forEach(step => {
      expect(step.step).toBeTypeOf('number');
      expect(step.concept).toBeDefined();
      expect(step.prerequisites).toBeInstanceOf(Array);
    });
    
    console.log(`✅ [TEST] Topic analysis successful:`);
    console.log(`   - Generated ${topicBreakdown.keyAspects.length} key aspects`);
    console.log(`   - Created ${topicBreakdown.learningPath.length} learning steps`);
    console.log(`   - Difficulty: ${topicBreakdown.difficulty}`);
    console.log(`   - Estimated time: ${topicBreakdown.estimatedTime}`);
  }, 30000); // 30 second timeout for AI calls

  it('should expand a concept from the topic breakdown', async () => {
    expect(topicBreakdown).toBeDefined();
    expect(topicBreakdown.keyAspects.length).toBeGreaterThan(0);
    
    const firstAspect = topicBreakdown.keyAspects[0];
    console.log(`🔍 [TEST] Testing concept expansion for: "${firstAspect.name}"`);
    
    const response = await fetch('/api/expand-concept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        concept: firstAspect.name, 
        parentTopic: TEST_TOPIC 
      }),
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const expansion: ConceptExpansion = result.data;
    
    // Validate structure
    expect(expansion.concept).toBe(firstAspect.name);
    expect(expansion.subConcepts).toBeInstanceOf(Array);
    expect(expansion.subConcepts.length).toBeGreaterThan(2);
    expect(expansion.practicalApplications).toBeInstanceOf(Array);
    expect(expansion.commonMisconceptions).toBeInstanceOf(Array);
    expect(expansion.resources).toBeInstanceOf(Array);
    
    // Validate sub-concepts structure
    expansion.subConcepts.forEach(subConcept => {
      expect(subConcept.name).toBeDefined();
      expect(subConcept.description).toBeDefined();
      expect(subConcept.examples).toBeInstanceOf(Array);
      expect(subConcept.relatedTo).toBeInstanceOf(Array);
      expect(['beginner', 'intermediate', 'advanced']).toContain(subConcept.difficulty);
    });
    
    // Validate resources structure
    expansion.resources.forEach(resource => {
      expect(['article', 'video', 'book', 'course', 'documentation']).toContain(resource.type);
      expect(resource.title).toBeDefined();
      expect(resource.description).toBeDefined();
    });
    
    console.log(`✅ [TEST] Concept expansion successful:`);
    console.log(`   - Generated ${expansion.subConcepts.length} sub-concepts`);
    console.log(`   - Found ${expansion.practicalApplications.length} practical applications`);
    console.log(`   - Listed ${expansion.commonMisconceptions.length} common misconceptions`);
    console.log(`   - Provided ${expansion.resources.length} learning resources`);
  }, 30000); // 30 second timeout for AI calls

  it('should create valid mind map structure from topic breakdown', async () => {
    expect(topicBreakdown).toBeDefined();
    
    // Import the mind map creation function
    const { createMindMapFromBreakdown } = await import('../services/topicAnalysis.js');
    
    const mindMap = createMindMapFromBreakdown(topicBreakdown);
    
    expect(mindMap).toBeDefined();
    expect(mindMap.nodes).toBeInstanceOf(Array);
    expect(mindMap.edges).toBeInstanceOf(Array);
    
    // Should have one main node + concept nodes
    expect(mindMap.nodes.length).toBe(1 + topicBreakdown.keyAspects.length);
    expect(mindMap.edges.length).toBe(topicBreakdown.keyAspects.length);
    
    // Validate main node
    const mainNode = mindMap.nodes.find((node: any) => node.data.isMainTopic);
    expect(mainNode).toBeDefined();
    expect(mainNode.data.label).toBe(TEST_TOPIC);
    
    // Validate concept nodes
    const conceptNodes = mindMap.nodes.filter((node: any) => !node.data.isMainTopic);
    expect(conceptNodes.length).toBe(topicBreakdown.keyAspects.length);
    
    conceptNodes.forEach((node: any) => {
      expect(node.data.label).toBeDefined();
      expect(node.data.description).toBeDefined();
      expect(node.data.expandable).toBe(true);
      expect(node.position).toBeDefined();
      expect(node.position.x).toBeTypeOf('number');
      expect(node.position.y).toBeTypeOf('number');
    });
    
    console.log(`✅ [TEST] Mind map creation successful:`);
    console.log(`   - Created ${mindMap.nodes.length} nodes`);
    console.log(`   - Created ${mindMap.edges.length} edges`);
    console.log(`   - Main topic: ${mainNode.data.label}`);
  });

  it('should handle API errors gracefully', async () => {
    console.log('🚫 [TEST] Testing error handling with invalid input');
    
    const response = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic: '' }), // Empty topic should fail
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    
    const errorResult = await response.json();
    expect(errorResult.error).toBeDefined();
    
    console.log(`✅ [TEST] Error handling works correctly`);
  });

  it('should complete full end-to-end workflow', async () => {
    console.log('🎯 [TEST] Running complete end-to-end workflow test');
    
    // 1. Analyze topic
    const topicResponse = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Artificial Intelligence' }),
    });
    
    const topicResult = await topicResponse.json();
    expect(topicResult.success).toBe(true);
    
    // 2. Create mind map
    const { createMindMapFromBreakdown } = await import('../services/topicAnalysis.js');
    const mindMap = createMindMapFromBreakdown(topicResult.data);
    
    // 3. Expand first concept
    const firstConcept = topicResult.data.keyAspects[0];
    const expansionResponse = await fetch('/api/expand-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        concept: firstConcept.name, 
        parentTopic: 'Artificial Intelligence' 
      }),
    });
    
    const expansionResult = await expansionResponse.json();
    expect(expansionResult.success).toBe(true);
    
    // 4. Create expanded nodes
    const { createExpandedConceptNodes } = await import('../services/topicAnalysis.js');
    const expandedNodes = createExpandedConceptNodes(
      'concept-0',
      expansionResult.data,
      { x: 400, y: 300 }
    );
    
    expect(expandedNodes.nodes.length).toBeGreaterThan(0);
    expect(expandedNodes.edges.length).toBeGreaterThan(0);
    
    console.log(`🎉 [TEST] Complete workflow successful:`);
    console.log(`   - Topic analyzed: Artificial Intelligence`);
    console.log(`   - Mind map created with ${mindMap.nodes.length} nodes`);
    console.log(`   - Concept expanded: ${firstConcept.name}`);
    console.log(`   - Generated ${expandedNodes.nodes.length} sub-concept nodes`);
    
    // Return summary for integration
    return {
      topicAnalysisWorking: true,
      conceptExpansionWorking: true,
      mindMapGenerationWorking: true,
      totalNodes: mindMap.nodes.length + expandedNodes.nodes.length,
      totalEdges: mindMap.edges.length + expandedNodes.edges.length
    };
  }, 60000); // 60 second timeout for full workflow
});

// Export test runner function for manual execution
export async function runAIIntegrationTest(): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> {
  console.log('🧪 [MANUAL TEST] Starting AI integration test...');
  
  const errors: string[] = [];
  let results: any = {};
  
  try {
    // Test topic analysis
    console.log('📝 [MANUAL TEST] Testing topic analysis...');
    const topicResponse = await fetch('/api/analyze-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Web Development' }),
    });
    
    if (!topicResponse.ok) {
      throw new Error(`Topic analysis failed: ${topicResponse.status}`);
    }
    
    const topicResult = await topicResponse.json();
    results.topicAnalysis = topicResult.data;
    
    // Test mind map creation
    console.log('🗺️ [MANUAL TEST] Testing mind map creation...');
    const { createMindMapFromBreakdown } = await import('../services/topicAnalysis.js');
    const mindMap = createMindMapFromBreakdown(topicResult.data);
    results.mindMap = {
      nodeCount: mindMap.nodes.length,
      edgeCount: mindMap.edges.length
    };
    
    // Test concept expansion
    console.log('🔍 [MANUAL TEST] Testing concept expansion...');
    const firstConcept = topicResult.data.keyAspects[0];
    const expansionResponse = await fetch('/api/expand-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        concept: firstConcept.name, 
        parentTopic: 'Web Development' 
      }),
    });
    
    if (!expansionResponse.ok) {
      throw new Error(`Concept expansion failed: ${expansionResponse.status}`);
    }
    
    const expansionResult = await expansionResponse.json();
    results.conceptExpansion = {
      concept: expansionResult.data.concept,
      subConceptCount: expansionResult.data.subConcepts.length
    };
    
    console.log('✅ [MANUAL TEST] All tests passed!');
    return { success: true, results, errors };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);
    console.error('❌ [MANUAL TEST] Test failed:', errorMessage);
    return { success: false, results, errors };
  }
}
