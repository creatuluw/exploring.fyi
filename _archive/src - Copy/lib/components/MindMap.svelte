<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import TopicNode from './TopicNode.svelte';
	import ConceptNode from './ConceptNode.svelte';
	import NodeDetailsPanel from './NodeDetailsPanel.svelte';
	import ChatPanel from './ChatPanel.svelte';
import { expandConcept, createExpandedConceptNodes } from '$lib/services/topicAnalysis.js';
import { expandConceptWithPersistence } from '$lib/services/topicAnalysisWithPersistence.js';
import { mindMapEvents, clearNodeEvent } from '$lib/stores/mindMapEvents';
import { createContentId } from '$lib/services/contentGeneration.js';
import { progressTracker } from '$lib/services/progressTracking.js';
import { session } from '$lib/stores/session.js';
import { aiLanguage } from '$lib/stores/language.js';
import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { ErrorRecovery } from '$lib/utils/errorRecovery.js';
	import { optimisticAnimations } from '$lib/utils/animations.js';
	
	interface MindMapData {
		nodes: Node[];
		edges: Edge[];
		isStreaming?: boolean;
		currentStep?: string;
	}
	
	interface Props {
		data: MindMapData;
		detailsPanelOpen?: boolean;
		selectedNodeData?: any;
	}
	
	let { data, detailsPanelOpen = $bindable(false), selectedNodeData = $bindable(null) }: Props = $props();
	
	// Node types for Svelte Flow
	const nodeTypes = {
		topicNode: TopicNode,
		conceptNode: ConceptNode
	};
	
	// Reactive variables for nodes and edges
	let nodes = $state<Node[]>(data.nodes || []);
	let edges = $state<Edge[]>(data.edges || []);
	
	// Panel states
	let chatPanelOpen = $state(false);
	let chatTopic = $state('');
	
	// Progress tracking - use the global instance
	let currentTopicId = $state<string | null>(null);
	
	// Track optimistic expansions for rollback
	let optimisticExpansions = new Map<string, { nodeIds: string[], edgeIds: string[] }>();
	
	// Update nodes and edges when data changes
	$effect(() => {
		if (data?.nodes) {
			nodes = data.nodes;
			
			// Start tracking for the main topic node if we have one
			const mainNode = data.nodes.find(n => n.data?.isMainTopic);
			if (mainNode && !currentTopicId) {
				// In a real implementation, we'd get the topic ID from the data
				// For now, we'll use the node label as a temporary identifier
				currentTopicId = mainNode.data.label as string;
				progressTracker.startTopicTracking(currentTopicId);
			}
		}
		if (data?.edges) {
			edges = data.edges;
		}
	});

	// Listen for node events
	$effect(() => {
		const unsubscribe = mindMapEvents.subscribe((event) => {
			if (event) {
				switch (event.type) {
					case 'openDetails':
						// Open details panel instead of navigating away
						selectedNodeData = event.nodeData;
						detailsPanelOpen = true;
						chatPanelOpen = false;
						break;
					case 'openChat':
						chatTopic = event.nodeData.label;
						chatPanelOpen = true;
						detailsPanelOpen = false;
						break;
					case 'expand':
						handleNodeExpand(event.nodeId, event.nodeData);
						break;
					case 'click':
						handleNodeClick({ detail: { node: { id: event.nodeId, data: event.nodeData } } } as CustomEvent);
						// Track node click for analytics
						if (currentTopicId) {
							progressTracker.trackNodeClick(currentTopicId, event.nodeId, event.nodeData);
						}
						break;
				}
				clearNodeEvent();
			}
		});

		return () => {
			unsubscribe();
		};
	});
	
	// Generate placeholder nodes for optimistic expansion
	const createPlaceholderNodes = (parentNodeId: string, parentPosition: any, count: number = 4) => {
		const placeholderNodes = [];
		const placeholderEdges = [];
		const radius = 180;
		
		for (let i = 0; i < count; i++) {
			const angle = (i * 2 * Math.PI) / count;
			const x = parentPosition.x + Math.cos(angle) * radius;
			const y = parentPosition.y + Math.sin(angle) * radius;
			
			const nodeId = `placeholder-${parentNodeId}-${i}`;
			
			placeholderNodes.push({
				id: nodeId,
				type: 'conceptNode',
				position: { x: x - 100, y: y - 40 }, // Center the node
				data: {
					label: '...',
					description: 'Loading concept...',
					level: 1,
					expandable: false,
					isPlaceholder: true,
					parentNode: parentNodeId,
					expanding: false
				}
			});
			
			placeholderEdges.push({
				id: `edge-${parentNodeId}-${nodeId}`,
				source: parentNodeId,
				target: nodeId,
				type: 'smoothstep',
				style: 'stroke: #d1d5db; stroke-dasharray: 5,5;', // Dashed for placeholder
				animated: true
			});
		}
		
		return { nodes: placeholderNodes, edges: placeholderEdges };
	};

	// Remove placeholder nodes and edges
	const removePlaceholders = (parentNodeId: string) => {
		const expansion = optimisticExpansions.get(parentNodeId);
		if (!expansion) return;
		
		// Remove placeholder nodes and edges
		nodes = nodes.filter(n => !expansion.nodeIds.includes(n.id));
		edges = edges.filter(e => !expansion.edgeIds.includes(e.id));
		
		// Clean up tracking
		optimisticExpansions.delete(parentNodeId);
	};

	// Replace placeholders with real nodes
	const replacePlaceholdersWithReal = (parentNodeId: string, realNodes: any[], realEdges: any[]) => {
		// Remove placeholders first
		removePlaceholders(parentNodeId);
		
		// Add real nodes and edges
		nodes = [...nodes, ...realNodes];
		edges = [...edges, ...realEdges];
		
		// Animate new nodes
		setTimeout(() => {
			const newNodeElements = document.querySelectorAll(`[data-id^="${parentNodeId}-"]`);
			optimisticAnimations.slideInNodes(Array.from(newNodeElements) as HTMLElement[]);
		}, 50);
	};

	// Handle node expansion
	const handleNavigateToContent = (nodeData: any) => {
		console.log('🔗 [MindMap] Navigating to content page for:', nodeData.label);
		
		const contentId = createContentId(nodeData.label, nodeData.parentTopic);
		const params = new URLSearchParams({
			topic: nodeData.label,
			difficulty: nodeData.difficulty || 'intermediate'
		});
		
		// Enhanced context with complete node information
		const mainTopicNode = nodes.find(n => n.data?.isMainTopic);
		const enhancedContext = {
			// Main topic information
			mainTopic: {
				title: mainTopicNode?.data?.label || '',
				description: mainTopicNode?.data?.description || ''
			},
			// Current node information  
			nodeInfo: {
				description: nodeData.description || '',
				level: nodeData.level || 0,
				importance: nodeData.importance || 'medium',
				connections: nodeData.connections || [],
				parentId: nodeData.parentId || ''
			}
		};
		
		// Add enhanced context as JSON string
		params.set('context', JSON.stringify(enhancedContext));
		
		// Add legacy context for backward compatibility
		if (nodeData.parentTopic) {
			params.set('parentTopic', nodeData.parentTopic);
		}
		
		goto(`/topic/${contentId}?${params.toString()}`);
	};

	const handleNodeExpand = async (nodeId: string, nodeData: any) => {
		console.log(`🚀 [MindMap] Starting optimistic node expansion for: "${nodeData.label}" (ID: ${nodeId})`);
		
		// Track concept expansion for analytics
		if (currentTopicId) {
			progressTracker.trackConceptExpansion(currentTopicId, nodeId, {
				conceptLabel: nodeData.label,
				level: nodeData.level || 0,
				parentTopic: nodeData.parentTopic
			});
		}
		
		// Don't expand if already expanded
		if (nodeData.expanded) {
			console.log(`⚠️ [MindMap] Node already expanded: ${nodeId}`);
			return;
		}
		
		const expandingNode = nodes.find(n => n.id === nodeId);
		if (!expandingNode) return;

		// Use ErrorRecovery for optimistic expansion
		await ErrorRecovery.withAIServiceRecovery(
			`node-expand-${nodeId}`,
			() => {
				// Optimistic Update: Add placeholder nodes immediately
				console.log(`✨ [MindMap] Adding placeholder nodes for: ${nodeId}`);
				
				// Mark node as expanded and not expanding (optimistic)
				nodes = nodes.map(node => 
					node.id === nodeId 
						? { ...node, data: { ...node.data, expanded: true, expanding: false } }
						: node
				);
				
				// Create and add placeholder nodes
				const { nodes: placeholderNodes, edges: placeholderEdges } = createPlaceholderNodes(
					nodeId, 
					expandingNode.position
				);
				
				// Track for potential rollback
				const placeholderNodeIds = placeholderNodes.map(n => n.id);
				const placeholderEdgeIds = placeholderEdges.map(e => e.id);
				optimisticExpansions.set(nodeId, {
					nodeIds: placeholderNodeIds,
					edgeIds: placeholderEdgeIds
				});
				
				// Add placeholders to the mind map
				nodes = [...nodes, ...placeholderNodes];
				edges = [...edges, ...placeholderEdges];
				
				console.log(`✅ [MindMap] Added ${placeholderNodes.length} placeholder nodes`);
			},
			async () => {
				// Real Operation: Get AI expansion
				console.log(`🤖 [MindMap] Getting real AI expansion for: "${nodeData.label}"`);
				
				const sessionState = get(session);
				if (sessionState.id && currentTopicId) {
					// Use enhanced AI service with persistence
					const mindMapId = 'current-mindmap'; // TODO: Pass proper mindMapId
					await expandConceptWithPersistence(nodeData.label, nodeData.parentTopic, mindMapId, nodeId);
				} else {
					// Fallback to basic expansion
					const currentLanguage = get(aiLanguage);
					const expansion = await expandConcept(nodeData.label, nodeData.parentTopic, currentLanguage);
					console.log(`✅ [MindMap] AI expansion received with ${expansion.subConcepts.length} sub-concepts`);
				
					// Create real nodes and edges from AI expansion
					const { nodes: realNodes, edges: realEdges } = createExpandedConceptNodes(
						nodeId, 
						expansion, 
						expandingNode.position
					);
					
					// Replace placeholders with real content
					replacePlaceholdersWithReal(nodeId, realNodes, realEdges);
					
					console.log(`🎉 [MindMap] Replaced placeholders with ${realNodes.length} real nodes`);
				}
			},
			() => {
				// Rollback: Remove placeholders and reset node state
				console.log(`🔄 [MindMap] Rolling back optimistic expansion for: ${nodeId}`);
				
				// Remove placeholder nodes
				removePlaceholders(nodeId);
				
				// Reset node state
				nodes = nodes.map(node => 
					node.id === nodeId 
						? { ...node, data: { ...node.data, expanded: false, expanding: false } }
						: node
				);
			}
		);
	};
	
	const generateMockSubConcepts = (parentData: any) => {
		// TODO: Replace with actual AI service
		const concepts = [
			{ label: 'Core Principles', description: 'Fundamental concepts and theories' },
			{ label: 'Key Applications', description: 'Real-world uses and implementations' },
			{ label: 'Historical Context', description: 'Background and development' },
			{ label: 'Related Fields', description: 'Connected disciplines and areas' }
		];
		
		return concepts;
	};
	
	// Handle node clicks for navigation to content pages
	const handleNodeClick = (event: CustomEvent) => {
		const node = event.detail.node;
		console.log('🔗 [MindMap] Node clicked for navigation:', node.data.label);
		
		// Navigate to dedicated topic page using existing navigation function
		handleNavigateToContent(node.data);
	};
	
	// Handle node expansion clicks
	const handleNodeExpandClick = (event: CustomEvent) => {
		const node = event.detail.node;
		handleNodeExpand(node.id, node.data);
	};


	// Handle closing panels
	const handleCloseChat = () => {
		chatPanelOpen = false;
		chatTopic = '';
	};
	
	// Flow options with improved zoom and positioning
	const flowOptions = {
		fitView: true,
		fitViewOptions: {
			padding: 50,
			minZoom: 1,
			maxZoom: 2.5
		},
		defaultViewport: {
			x: 0,
			y: 0,
			zoom: 1.8
		},
		minZoom: 0.5,
		maxZoom: 4,
		snapToGrid: true,
		snapGrid: [40, 40] as [number, number]
	};
</script>

<div class="mind-map-container w-full h-full bg-zinc-50 relative">
	{#if data.isStreaming}
		<!-- Streaming progress indicator -->
		<div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
			<div class="bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg px-4 py-2 shadow-lg">
				<div class="flex items-center space-x-3">
					<div class="w-4 h-4 bg-zinc-100 rounded-full flex items-center justify-center">
						<div class="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
					</div>
					<span class="text-sm font-medium text-zinc-900">
						{data.currentStep || 'Building mind map...'}
					</span>
				</div>
			</div>
		</div>
	{/if}

	<SvelteFlow 
		{nodes}
		{edges}
		{nodeTypes}
		{...flowOptions}
	>
		<!-- Flow controls -->
		<Controls 
			showZoom={true}
			showFitView={true}
			class="controls-custom"
		/>
		
		<!-- Background pattern -->
		<Background 
			gap={20} 
			size={1}
		/>
		
		<!-- Mini map for navigation -->
		<MiniMap 
			nodeColor="#71717a"
			nodeStrokeWidth={2}
			nodeBorderRadius={4}
			maskColor="rgba(0, 0, 0, 0.1)"
			class="minimap-custom"
		/>
	</SvelteFlow>
</div>


<!-- Chat Panel -->
<ChatPanel 
	open={chatPanelOpen}
	topic={chatTopic}
	onclose={handleCloseChat}
/>

<style>
	:global(.mind-map-container .svelte-flow__controls) {
		background-color: #ffffff;
		border: 1px solid #e4e4e7;
		border-radius: var(--radius-lg);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}
	
	:global(.mind-map-container .svelte-flow__controls button) {
		color: #52525b;
		border-color: #e4e4e7;
	}
	
	:global(.mind-map-container .svelte-flow__controls button:hover) {
		color: #18181b;
		background-color: #fafafa;
	}
	
	:global(.mind-map-container .svelte-flow__minimap) {
		background-color: #ffffff;
		border: 1px solid #e4e4e7;
		border-radius: var(--radius-lg);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}
	
	:global(.mind-map-container .svelte-flow__attribution) {
		opacity: 0;
	}
</style>
