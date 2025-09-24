// Test mindmap loading
import { MindMapsService } from './src/lib/database/mindMaps.js';

async function testMindmapLoading() {
  try {
    console.log('🔍 Testing mindmap loading for slug: websites-bouwen-mindmap');
    
    const mindMap = await MindMapsService.getMindMapBySlug('websites-bouwen-mindmap');
    
    if (mindMap) {
      console.log('✅ [SUCCESS] Mindmap found!');
      console.log('  - ID:', mindMap.id);
      console.log('  - Topic ID:', mindMap.topic_id);
      console.log('  - Slug:', mindMap.slug);
      console.log('  - Nodes count:', mindMap.nodes.length);
      console.log('  - Edges count:', mindMap.edges.length);
    } else {
      console.log('❌ [FAILED] Mindmap not found');
    }
    
  } catch (error) {
    console.error('❌ [ERROR] Failed to load mindmap:', error);
  }
}

testMindmapLoading();
