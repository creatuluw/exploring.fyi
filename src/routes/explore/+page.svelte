<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ArrowLeft, Brain, ExternalLink, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import MindMap from '$lib/components/MindMap.svelte';
	import { 
		analyzeTopic, 
		createMindMapFromBreakdown, 
		analyzeTopicStreaming, 
		analyzeUrlStreaming,
		type StreamingNodeData 
	} from '$lib/services/topicAnalysis.js';
	import { analyzeUrl, createMindMapFromUrlAnalysis, validateUrl } from '$lib/services/urlAnalysis.js';

	// Reactive variables for page state
	let topic = $state('');
	let url = $state('');
	let isLoading = $state(true);
	let error = $state('');
	let mindMapData = $state<any>(null);
	let hasNodes = $state(false); // Track if we have any nodes to show
	let hasInitialized = $state(false); // Prevent infinite loops

	// Extract parameters from URL
	$effect(() => {
		const searchParams = $page.url.searchParams;
		const newTopic = searchParams.get('topic') || '';
		const newUrl = searchParams.get('url') || '';
		
		// Only initialize if parameters actually changed and we haven't initialized yet
		if ((newTopic !== topic || newUrl !== url) || !hasInitialized) {
			topic = newTopic;
			url = newUrl;
			
			// Initialize mind map when parameters change
			if (topic || url) {
				hasInitialized = true;
				initializeMindMap();
			}
		}
	});

	const initializeMindMap = async () => {
		console.log('🚀 [UI] Starting progressive mind map initialization...');
		isLoading = true;
		hasNodes = false;
		error = '';
		mindMapData = null;
		
		try {
			if (topic) {
				console.log(`📝 [UI] Processing topic with streaming: "${topic}"`);
				await analyzeTopicStreaming(topic, handleStreamingProgress);
			} else if (url) {
				console.log(`🔗 [UI] Processing URL with streaming: "${url}"`);
				await analyzeUrlStreaming(url, handleStreamingProgress);
			}
			
			console.log('✅ [UI] Progressive mind map generation completed successfully');
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to generate mind map';
			
			// Check for specific error types to provide better user feedback
			if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
				error = 'Unable to connect to AI service. Please check your internet connection and try again.';
			} else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
				error = 'AI service configuration error. Please check the setup.';
			} else {
				error = errorMessage;
			}
			
			console.error('❌ [UI] Mind map generation error:', err);
			hasNodes = false;
			isLoading = false;
		}
	};

	const handleStreamingProgress = (streamData: StreamingNodeData) => {
		console.log('📊 [UI] Streaming progress:', streamData.currentStep, `${streamData.nodes.length} nodes`);
		
		// Update mind map data with new nodes/edges
		mindMapData = {
			nodes: streamData.nodes,
			edges: streamData.edges,
			isStreaming: !streamData.isComplete,
			currentStep: streamData.currentStep
		};

		// Show mind map as soon as we have nodes
		if (streamData.nodes.length > 0 && !hasNodes) {
			hasNodes = true;
			isLoading = false; // Stop showing initial loading spinner
		}

		// Final completion
		if (streamData.isComplete) {
			console.log('🎉 [UI] Mind map streaming completed!');
		}
	};

	const generateMindMapFromTopic = async (topicName: string) => {
		console.log(`🎯 [UI] Generating mind map for topic: "${topicName}"`);
		
		try {
			// Use AI service to analyze the topic
			console.log(`🔄 [UI] Calling analyzeTopic service...`);
			const breakdown = await analyzeTopic(topicName);
			
			console.log(`🗺️ [UI] Creating mind map structure from breakdown...`);
			// Create mind map structure from AI analysis
			const mindMap = createMindMapFromBreakdown(breakdown);
			console.log(`✅ [UI] Mind map created with ${mindMap.nodes.length} nodes and ${mindMap.edges.length} edges`);
			
			return mindMap;
		} catch (err) {
			console.error('❌ [UI] Topic analysis failed:', err);
			
			// Fallback to basic structure if AI fails
			return {
				nodes: [
					{
						id: 'main',
						type: 'topicNode',
						position: { x: 400, y: 300 },
						data: {
							label: topicName,
							description: `Exploring ${topicName} - AI analysis temporarily unavailable`,
							level: 0,
							expandable: true,
							isMainTopic: true,
							error: 'AI analysis failed'
						}
					}
				],
				edges: []
			};
		}
	};

	const generateMindMapFromUrl = async (urlString: string) => {
		console.log(`🌐 [UI] Generating mind map for URL: "${urlString}"`);
		
		try {
			// Validate URL format first
			console.log(`🔍 [UI] Validating URL format...`);
			const validation = validateUrl(urlString);
			if (!validation.isValid) {
				console.error(`❌ [UI] URL validation failed: ${validation.error}`);
				throw new Error(validation.error || 'Invalid URL');
			}
			console.log(`✅ [UI] URL validation passed`);
			
			// Use AI service to analyze the URL
			console.log(`🔄 [UI] Calling analyzeUrl service...`);
			const analysis = await analyzeUrl(urlString);
			
			console.log(`🗺️ [UI] Creating mind map structure from URL analysis...`);
			// Create mind map structure from AI analysis
			const mindMap = createMindMapFromUrlAnalysis(analysis, urlString);
			console.log(`✅ [UI] Mind map created with ${mindMap.nodes.length} nodes and ${mindMap.edges.length} edges`);
			
			return mindMap;
		} catch (err) {
			console.error('❌ [UI] URL analysis failed:', err);
			
			// Fallback to basic structure if AI fails
			const domain = new URL(urlString).hostname;
			return {
				nodes: [
					{
						id: 'main',
						type: 'topicNode',
						position: { x: 400, y: 300 },
						data: {
							label: `Content from ${domain}`,
							description: `Analyzing content from ${urlString} - AI analysis temporarily unavailable`,
							level: 0,
							expandable: true,
							isMainTopic: true,
							sourceUrl: urlString,
							error: 'AI analysis failed'
						}
					}
				],
				edges: []
			};
		}
	};

	const handleBackToHome = () => {
		goto('/');
	};
</script>

<svelte:head>
	<title>Explore {topic || 'Content'} - Explore.fyi</title>
	<meta name="description" content="Interactive mind map exploration of {topic || 'web content'} powered by AI" />
</svelte:head>

<div class="min-h-screen bg-zinc-50">
	<!-- Header with back navigation -->
	<div class="bg-white border-b border-zinc-200 sticky top-16 z-40">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-14">
				<button 
					onclick={handleBackToHome}
					class="flex items-center space-x-2 text-zinc-600 hover:text-zinc-900 transition-colors duration-200"
				>
					<ArrowLeft class="h-4 w-4" />
					<span class="font-medium text-sm">Back to Home</span>
				</button>
				
				<div class="flex items-center space-x-4">
					{#if topic}
						<div class="flex items-center space-x-2">
							<Brain class="h-4 w-4 text-zinc-500" />
							<span class="text-sm font-medium text-zinc-900">{topic}</span>
						</div>
					{:else if url}
						<div class="flex items-center space-x-2">
							<ExternalLink class="h-4 w-4 text-zinc-500" />
							<span class="text-sm font-medium text-zinc-900 truncate max-w-xs">
								{new URL(url).hostname}
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main content area -->
	<main class="relative">
		{#if isLoading && !hasNodes}
			<!-- Initial loading state - show until first nodes appear -->
			<div class="flex flex-col items-center justify-center h-[calc(100vh-140px)]">
				<div class="text-center space-y-6">
					<div class="flex justify-center">
						<div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
							<Loader2 class="h-8 w-8 text-zinc-600 animate-spin" />
						</div>
					</div>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-zinc-900">
							{topic ? 'Analyzing Topic' : 'Processing Content'}
						</h2>
						<p class="text-zinc-600 max-w-md">
							{topic 
								? `AI is breaking down "${topic}" into connected concepts...`
								: 'AI is extracting and organizing key information...'
							}
						</p>
					</div>
				</div>
			</div>
		{:else if error}
			<!-- Error state -->
			<div class="flex flex-col items-center justify-center h-[calc(100vh-140px)]">
				<div class="text-center space-y-6 max-w-md">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
						<ExternalLink class="h-8 w-8 text-red-600" />
					</div>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-zinc-900">
							Something went wrong
						</h2>
						<p class="text-zinc-600">
							{error}
						</p>
					</div>
					<div class="space-y-3">
						<button 
							onclick={() => {
								hasInitialized = false;
								initializeMindMap();
							}}
							class="btn btn-primary"
						>
							Try Again
						</button>
						<button 
							onclick={handleBackToHome}
							class="btn btn-secondary"
						>
							Back to Home
						</button>
					</div>
				</div>
			</div>
		{:else if hasNodes && mindMapData}
			<!-- Mind map visualization - shown as soon as nodes are available -->
			<div class="h-[calc(100vh-140px)]">
				<MindMap data={mindMapData} />
			</div>
		{/if}
	</main>
</div>
