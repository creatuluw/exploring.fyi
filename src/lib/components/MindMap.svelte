<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import TopicNode from './TopicNode.svelte';
	import ConceptNode from './ConceptNode.svelte';
	import NodeDetailsPanel from './NodeDetailsPanel.svelte';
	import ChatPanel from './ChatPanel.svelte';
	import { expandConcept, createExpandedConceptNodes } from '$lib/services/topicAnalysis.js';
	import { mindMapEvents, clearNodeEvent } from '$lib/stores/mindMapEvents';
	import { createContentId } from '$lib/services/contentGeneration.js';
	import { goto } from '$app/navigation';
	
	interface MindMapData {
		nodes: Node[];
		edges: Edge[];
		isStreaming?: boolean;
		currentStep?: string;
	}
	
	interface Props {
		data: MindMapData;
	}
	
	let { data }: Props = $props();
	
	// Node types for Svelte Flow
	const nodeTypes = {
		topicNode: TopicNode,
		conceptNode: ConceptNode
	};
	
	// Reactive variables for nodes and edges
	let nodes = $state<Node[]>(data.nodes || []);
	let edges = $state<Edge[]>(data.edges || []);
	
	// Panel states
	let detailsPanelOpen = $state(false);
	let chatPanelOpen = $state(false);
	let selectedNodeData = $state<any>(null);
	let chatTopic = $state('');
	
	// Update nodes and edges when data changes
	$effect(() => {
		if (data?.nodes) {
			nodes = data.nodes;
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
						// Navigate to content page instead of opening details panel
						handleNavigateToContent(event.nodeData);
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
						break;
				}
				clearNodeEvent();
			}
		});

		return () => {
			unsubscribe();
		};
	});
	
	// Handle node expansion
	const handleNavigateToContent = (nodeData: any) => {
		console.log('🔗 [MindMap] Navigating to content page for:', nodeData.label);
		
		const contentId = createContentId(nodeData.label, nodeData.parentTopic);
		const params = new URLSearchParams({
			topic: nodeData.label,
			difficulty: nodeData.difficulty || 'intermediate'
		});
		
		// Add context if this is a sub-concept
		if (nodeData.parentTopic) {
			params.set('context', nodeData.parentTopic);
		}
		
		goto(`/topic/${contentId}?${params.toString()}`);
	};

	const handleNodeExpand = async (nodeId: string, nodeData: any) => {
		console.log(`🔄 [MindMap] Starting node expansion for: "${nodeData.label}" (ID: ${nodeId})`);
		
		// Don't expand if already expanded
		if (nodeData.expanded) {
			console.log(`⚠️ [MindMap] Node already expanded: ${nodeId}`);
			return;
		}
		
		// Mark node as loading
		const expandingNode = nodes.find(n => n.id === nodeId);
		if (!expandingNode) return;
		
		// Update node to show loading state
		const loadingNodes = nodes.map(node => 
			node.id === nodeId 
				? { ...node, data: { ...node.data, expanding: true } }
				: node
		);
		nodes = loadingNodes;
		
		try {
			console.log(`🤖 [MindMap] Calling expandConcept AI service...`);
			// Use AI service to expand the concept
			const expansion = await expandConcept(nodeData.label, nodeData.parentTopic);
			console.log(`✅ [MindMap] AI expansion received with ${expansion.subConcepts.length} sub-concepts`);
			
			// Create new nodes and edges from AI expansion
			const { nodes: newNodes, edges: newEdges } = createExpandedConceptNodes(
				nodeId, 
				expansion, 
				expandingNode.position
			);
			
			// Add new nodes and edges to the existing ones
			const updatedNodes = nodes.map(node => 
				node.id === nodeId 
					? { ...node, data: { ...node.data, expanding: false, expanded: true } }
					: node
			);
			
			nodes = [...updatedNodes, ...newNodes];
			edges = [...edges, ...newEdges];
			
			console.log(`🎉 [MindMap] Node expansion completed! Added ${newNodes.length} new nodes and ${newEdges.length} new edges`);
			
		} catch (error) {
			console.error(`❌ [MindMap] Failed to expand concept "${nodeData.label}":`, error);
			
			// Fallback to mock expansion if AI fails
			const mockSubConcepts = generateMockSubConcepts(nodeData);
			
			const newNodes = [...nodes];
			const startX = expandingNode.position.x;
			const startY = expandingNode.position.y;
			
			mockSubConcepts.forEach((concept, index) => {
				const angle = (index * 2 * Math.PI) / mockSubConcepts.length;
				const radius = Math.max(120, mockSubConcepts.length * 25); // Reduced and dynamic radius
				const x = startX + Math.cos(angle) * radius;
				const y = startY + Math.sin(angle) * radius;
				
				newNodes.push({
					id: `${nodeId}-fallback-${index}`,
					type: 'conceptNode',
					position: { x, y },
					data: {
						label: concept.label,
						description: concept.description,
						level: (nodeData.level || 0) + 1,
						expandable: false,
						parentId: nodeId,
						fallback: true
					}
				});
			});
			
			// Mark the expanded node as expanded
			const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
			if (nodeIndex !== -1) {
				newNodes[nodeIndex] = {
					...newNodes[nodeIndex],
					data: {
						...newNodes[nodeIndex].data,
						expanding: false,
						expanded: true,
						error: 'AI expansion failed'
					}
				};
			}
			
			nodes = newNodes;
			
			// Add connecting edges
			const newEdges = [...edges];
			
			mockSubConcepts.forEach((_, index) => {
				newEdges.push({
					id: `edge-${nodeId}-fallback-${index}`,
					source: nodeId,
					target: `${nodeId}-fallback-${index}`,
					type: 'smoothstep',
					animated: false,
					style: 'stroke: #9ca3af; stroke-width: 1.5;'
				});
			});
			
			edges = newEdges;
		}
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
		console.log('Node clicked:', node);
		
		// TODO: Navigate to content page
		// goto(`/topic/${node.id}?context=${encodeURIComponent(node.data.label)}`);
	};
	
	// Handle node expansion clicks
	const handleNodeExpandClick = (event: CustomEvent) => {
		const node = event.detail.node;
		handleNodeExpand(node.id, node.data);
	};


	// Handle closing panels
	const handleCloseDetails = () => {
		detailsPanelOpen = false;
		selectedNodeData = null;
	};

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

<!-- Node Details Panel -->
<NodeDetailsPanel 
	open={detailsPanelOpen}
	nodeData={selectedNodeData}
	onclose={handleCloseDetails}
	onstartchat={(e: CustomEvent) => {
		chatTopic = e.detail.topic;
		chatPanelOpen = true;
		detailsPanelOpen = false;
	}}
	onexploremore={(e: CustomEvent) => {
		console.log('Explore more:', e.detail.nodeData);
		// TODO: Implement explore more functionality
	}}
	onnavigate={(e: CustomEvent) => {
		console.log('Navigate to:', e.detail.topic);
		// TODO: Implement navigation to related topics
	}}
/>

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
