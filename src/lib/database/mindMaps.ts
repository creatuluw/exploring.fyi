/**
 * Mind Maps Service
 * Handles mind map data storage and node management
 */

import { supabase, dbHelpers, type Database } from './supabase.js';

type MindMap = Database['public']['Tables']['mind_maps']['Row'];
type MindMapInsert = Database['public']['Tables']['mind_maps']['Insert'];
type MindMapUpdate = Database['public']['Tables']['mind_maps']['Update'];

export interface MindMapNode {
  id: string;
  type: 'topicNode' | 'conceptNode';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    level?: number;
    expandable?: boolean;
    expanded?: boolean;
    [key: string]: any;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  [key: string]: any;
}

export class MindMapsService {
  /**
   * Save a complete mind map structure
   */
  static async saveMindMap(
    topicId: string,
    nodes: MindMapNode[],
    edges: MindMapEdge[],
    layoutData?: Record<string, any>
  ): Promise<MindMap> {
    try {
      // Get topic to extract its slug for mindmap slug generation
      const topic = await supabase
        .from('topics')
        .select('slug')
        .eq('id', topicId)
        .single();

      let mindMapSlug = '';
      if (topic.data?.slug) {
        mindMapSlug = await dbHelpers.generateUniqueMindMapSlug(topic.data.slug);
      } else {
        // Fallback: generate from topicId
        mindMapSlug = `mindmap-${Date.now()}`;
      }

      const mindMapData: MindMapInsert = {
        id: dbHelpers.generateId(),
        topic_id: topicId,
        slug: mindMapSlug,
        nodes: nodes as Record<string, any>[],
        edges: edges as Record<string, any>[],
        layout_data: layoutData || null
      };

      const { data, error } = await supabase
        .from('mind_maps')
        .insert(mindMapData)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('Saved mind map:', data.id, 'for topic:', topicId);
      return data;
    } catch (error) {
      console.error('Failed to save mind map:', error);
      throw error;
    }
  }

  /**
   * Update mind map nodes during streaming or expansion
   */
  static async updateMindMapNodes(
    mindMapId: string,
    nodes: MindMapNode[],
    edges: MindMapEdge[]
  ): Promise<MindMap | null> {
    try {
      const updateData: MindMapUpdate = {
        nodes: nodes as Record<string, any>[],
        edges: edges as Record<string, any>[],
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mind_maps')
        .update(updateData)
        .eq('id', mindMapId)
        .select()
        .single();

      if (error) dbHelpers.handleError(error);

      console.log('Updated mind map nodes:', mindMapId);
      return data;
    } catch (error) {
      console.error('Failed to update mind map nodes:', error);
      throw error;
    }
  }

  /**
   * Save node expansion data (when user expands a concept)
   */
  static async saveNodeExpansion(
    mindMapId: string,
    nodeId: string,
    expansionData: {
      newNodes: MindMapNode[];
      newEdges: MindMapEdge[];
    }
  ): Promise<boolean> {
    try {
      // Get current mind map
      const { data: mindMap, error: fetchError } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('id', mindMapId)
        .single();

      if (fetchError) dbHelpers.handleError(fetchError);

      // Merge new nodes and edges with existing ones
      const existingNodes = mindMap.nodes as MindMapNode[];
      const existingEdges = mindMap.edges as MindMapEdge[];

      // Remove duplicates and add new nodes
      const nodeIds = new Set(existingNodes.map(n => n.id));
      const newNodes = expansionData.newNodes.filter(n => !nodeIds.has(n.id));

      // Remove duplicates and add new edges
      const edgeIds = new Set(existingEdges.map(e => e.id));
      const newEdges = expansionData.newEdges.filter(e => !edgeIds.has(e.id));

      // Update the mind map
      const updatedNodes = [...existingNodes, ...newNodes];
      const updatedEdges = [...existingEdges, ...newEdges];

      await this.updateMindMapNodes(mindMapId, updatedNodes, updatedEdges);

      console.log('Saved node expansion for node:', nodeId);
      return true;
    } catch (error) {
      console.error('Failed to save node expansion:', error);
      return false;
    }
  }

  /**
   * Get mind map by topic ID
   */
  static async getMindMapByTopic(topicId: string): Promise<MindMap | null> {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No mind map found
        }
        dbHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      console.error('Failed to get mind map by topic:', error);
      return null;
    }
  }

  /**
   * Get mind map by ID
   */
  static async getMindMapById(mindMapId: string): Promise<MindMap | null> {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('id', mindMapId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        dbHelpers.handleError(error);
      }

      return data;
    } catch (error) {
      console.error('Failed to get mind map by ID:', error);
      return null;
    }
  }

  /**
   * Get mind map by slug
   */
  static async getMindMapBySlug(slug: string): Promise<MindMap | null> {
    return await dbHelpers.getMindMapBySlug(slug);
  }

  /**
   * Get all mind maps for a topic (including versions)
   */
  static async getMindMapVersions(topicId: string): Promise<MindMap[]> {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) dbHelpers.handleError(error);

      return data || [];
    } catch (error) {
      console.error('Failed to get mind map versions:', error);
      return [];
    }
  }

  /**
   * Delete a mind map
   */
  static async deleteMindMap(mindMapId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mind_maps')
        .delete()
        .eq('id', mindMapId);

      if (error) dbHelpers.handleError(error);

      console.log('Deleted mind map:', mindMapId);
      return true;
    } catch (error) {
      console.error('Failed to delete mind map:', error);
      return false;
    }
  }

  /**
   * Get mind map statistics
   */
  static async getMindMapStats(mindMapId: string) {
    try {
      const mindMap = await this.getMindMapById(mindMapId);
      if (!mindMap) return null;

      const nodes = mindMap.nodes as MindMapNode[];
      const edges = mindMap.edges as MindMapEdge[];

      // Analyze node types
      const nodeTypes = nodes.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate depth levels
      const levels = nodes.map(n => n.data.level || 0);
      const maxDepth = Math.max(...levels);

      // Count expanded nodes
      const expandedCount = nodes.filter(n => n.data.expanded).length;

      return {
        mind_map_id: mindMapId,
        total_nodes: nodes.length,
        total_edges: edges.length,
        node_types: nodeTypes,
        max_depth: maxDepth,
        expanded_nodes: expandedCount,
        created_at: mindMap.created_at,
        updated_at: mindMap.updated_at
      };
    } catch (error) {
      console.error('Failed to get mind map stats:', error);
      return null;
    }
  }

  /**
   * Search nodes within mind maps by session
   */
  static async searchNodes(
    sessionId: string,
    query: string,
    limit: number = 20
  ): Promise<Array<{ topic_id: string; node: MindMapNode; topic_title: string }>> {
    try {
      // Get topics for the session
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, title')
        .eq('session_id', sessionId);

      if (topicsError) dbHelpers.handleError(topicsError);

      if (!topics?.length) return [];

      const results: Array<{ topic_id: string; node: MindMapNode; topic_title: string }> = [];
      
      // Search through mind maps for each topic
      for (const topic of topics) {
        const mindMap = await this.getMindMapByTopic(topic.id);
        if (!mindMap) continue;

        const nodes = mindMap.nodes as MindMapNode[];
        const matchingNodes = nodes.filter(node => 
          node.data.label.toLowerCase().includes(query.toLowerCase()) ||
          (node.data.description && node.data.description.toLowerCase().includes(query.toLowerCase()))
        );

        for (const node of matchingNodes) {
          results.push({
            topic_id: topic.id,
            node,
            topic_title: topic.title
          });

          if (results.length >= limit) break;
        }

        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      console.error('Failed to search nodes:', error);
      return [];
    }
  }
}

export default MindMapsService;
