<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ArrowLeft, Brain, ExternalLink, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import MindMap from '$lib/components/MindMap.svelte';
	import InlineNodeDetailsPanel from '$lib/components/InlineNodeDetailsPanel.svelte';
	import { loadMindMapBySlug } from '$lib/services/topicAnalysisWithPersistence.js';
	import { MindMapsService } from '$lib/database/mindMaps.js';
	import { TopicsService } from '$lib/database/topics.js';

	// Reactive variables for page state
	let slug = $state('');
	let displayTitle = $state('Loading...');
	let isLoading = $state(true);
	let error = $state('');
	let mindMapData = $state<any>(null);
	let hasNodes = $state(false);
	let hasInitialized = $state(false);
	
	// Drawer state
	let detailsPanelOpen = $state(false);
	let selectedNodeData = $state<any>(null);

	// Extract slug from URL
	$effect(() => {
		const newSlug = $page.params.slug || '';
		
		if (newSlug !== slug || !hasInitialized) {
			slug = newSlug;
			
			if (slug) {
				hasInitialized = true;
				loadMindMapData();
			}
		}
	});

	const loadMindMapData = async () => {
		console.log(`🧠 [Mindmap] Loading mindmap by slug: "${slug}"`);
		
		// Reset state and show loading
		isLoading = true;
		hasNodes = false;
		error = '';
		
		// Set initial mind map with loading state
		mindMapData = {
			nodes: [{
				id: 'loading',
				type: 'topicNode',
				position: { x: 400, y: 300 },
				data: {
					label: 'Loading mindmap...',
					description: 'Retrieving saved mindmap...',
					level: 0,
					isMainTopic: true,
					isLoading: true
				}
			}],
			edges: [],
			isStreaming: false,
			currentStep: 'Loading mindmap...'
		};
		
		try {
			// Load mindmap by slug
			console.log(`🔍 [Mindmap] Calling MindMapsService.getMindMapBySlug("${slug}")`);
			const mindMap = await MindMapsService.getMindMapBySlug(slug);
			console.log(`📦 [Mindmap] Service returned:`, mindMap);
			
			if (mindMap) {
				console.log(`✅ [Mindmap] Found mindmap with ${mindMap.nodes.length} nodes`);
				
				// Get associated topic for title
				console.log(`🔍 [Mindmap] Loading topic by ID: ${mindMap.topic_id}`);
				const topic = await TopicsService.getTopicById(mindMap.topic_id);
				console.log(`📦 [Mindmap] Topic loaded:`, topic);
				
				if (topic) {
					displayTitle = topic.title;
				} else {
					displayTitle = `Mindmap: ${slug}`;
				}
				
				// Load the mindmap data
				const mindMapNodes = {
					nodes: mindMap.nodes as any[],
					edges: mindMap.edges as any[],
					isComplete: true,
					currentStep: 'Loaded from database'
				};
				
				console.log(`🎯 [Mindmap] Calling handleStreamingProgress with ${mindMapNodes.nodes.length} nodes`);
				handleStreamingProgress(mindMapNodes);
			} else {
				console.warn(`⚠️ [Mindmap] No mindmap found for slug: ${slug}`);
				error = `Mindmap not found: ${slug}`;
				hasNodes = false;
				isLoading = false;
			}
		} catch (err) {
			console.error(`❌ [Mindmap] Error loading mindmap by slug:`, err);
			console.error(`❌ [Mindmap] Error details:`, {
				name: err instanceof Error ? err.name : 'Unknown',
				message: err instanceof Error ? err.message : 'Unknown error',
				stack: err instanceof Error ? err.stack : 'No stack trace'
			});
			error = `Error loading mindmap: ${err instanceof Error ? err.message : 'Unknown error'}`;
			hasNodes = false;
			isLoading = false;
		}
	};

	const handleStreamingProgress = (data: any) => {
		mindMapData = {
			...data,
			isStreaming: false,
			currentStep: 'Ready'
		};
		hasNodes = data.nodes.length > 0;
		isLoading = false;
	};

	const handleCloseDetailsPanel = () => {
		detailsPanelOpen = false;
		selectedNodeData = null;
	};

	const handleBackToHistory = () => {
		goto('/history');
	};
</script>

<svelte:head>
	<title>{displayTitle} - Mindmap - Explore.fyi</title>
	<meta name="description" content="Interactive mindmap view for {displayTitle}. Explore concepts and their relationships in a visual format." />
</svelte:head>

<!-- Header -->
<div class="bg-white border-b border-zinc-200 sticky top-0 z-40">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Back button and title -->
			<div class="flex items-center space-x-3">
				<button
					onclick={handleBackToHistory}
					class="inline-flex items-center px-3 py-2 border border-zinc-300 shadow-sm text-sm leading-4 font-medium rounded-md text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
				>
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to History
				</button>
				
				<div class="flex items-center space-x-2">
					<Brain class="h-5 w-5 text-blue-600" />
					<h1 class="text-lg font-semibold text-zinc-900 truncate">
						{displayTitle}
					</h1>
				</div>
			</div>
			
			<!-- Status indicator -->
			<div class="flex items-center space-x-2">
				{#if isLoading}
					<div class="flex items-center text-sm text-zinc-500">
						<Loader2 class="h-4 w-4 mr-2 animate-spin" />
						Loading...
					</div>
				{:else if error}
					<div class="flex items-center text-sm text-red-600">
						Error
					</div>
				{:else if hasNodes}
					<div class="flex items-center text-sm text-green-600">
						<div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
						Ready
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Main content -->
<div class="flex-1 relative">
	{#if error}
		<!-- Error state -->
		<div class="flex items-center justify-center h-96">
			<div class="text-center">
				<div class="text-red-500 text-6xl mb-4">⚠️</div>
				<h2 class="text-xl font-semibold text-zinc-900 mb-2">Mindmap Not Found</h2>
				<p class="text-zinc-600 mb-4">{error}</p>
				<button
					onclick={handleBackToHistory}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to History
				</button>
			</div>
		</div>
	{:else if hasNodes && mindMapData}
		<!-- Mind map display -->
		<div class="h-[calc(100vh-64px)]">
			<MindMap
				data={mindMapData}
				bind:detailsPanelOpen={detailsPanelOpen}
				bind:selectedNodeData={selectedNodeData}
			/>
		</div>
		
		<!-- Details panel -->
		<InlineNodeDetailsPanel
			open={detailsPanelOpen}
			nodeData={selectedNodeData}
			onclose={handleCloseDetailsPanel}
		/>
	{:else}
		<!-- Loading state -->
		<div class="flex items-center justify-center h-96">
			<div class="text-center">
				<Loader2 class="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
				<h2 class="text-xl font-semibold text-zinc-900 mb-2">Loading Mindmap</h2>
				<p class="text-zinc-600">Retrieving your saved mindmap...</p>
			</div>
		</div>
	{/if}
</div>
