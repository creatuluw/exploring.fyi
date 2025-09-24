<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ArrowLeft, Brain, ExternalLink, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import MindMap from '$lib/components/MindMap.svelte';
	import InlineNodeDetailsPanel from '$lib/components/InlineNodeDetailsPanel.svelte';
import { 
	analyzeTopic, 
	createMindMapFromBreakdown, 
	analyzeTopicStreaming, 
	analyzeUrlStreaming,
	type StreamingNodeData 
} from '$lib/services/topicAnalysis.js';
import { aiLanguage } from '$lib/stores/language.js';
	import { 
		analyzeTopicStreamingWithPersistence,
		analyzeUrlStreamingWithPersistence,
		loadTopicMindMap 
	} from '$lib/services/topicAnalysisWithPersistence.js';
import { TopicsService } from '$lib/database/topics.js';
import { analyzeUrl, createMindMapFromUrlAnalysis, validateUrl } from '$lib/services/urlAnalysis.js';
import { ErrorRecovery } from '$lib/utils/errorRecovery.js';
import DuplicateTopicModal from '$lib/components/DuplicateTopicModal.svelte';
import { get } from 'svelte/store';

	// Reactive variables for page state
	let topic = $state('');
	let url = $state('');
	let displayTitle = $state(''); // The actual title to show in the header
	let isLoading = $state(true);
	let error = $state('');
	let mindMapData = $state<any>(null);
	let hasNodes = $state(false); // Track if we have any nodes to show
	let hasInitialized = $state(false); // Prevent infinite loops
	
	// Duplicate topic detection state
	let showDuplicateModal = $state(false);
	let duplicateTopicInfo = $state<any>(null);
	let pendingAnalysisType = $state<'topic' | 'url' | null>(null);
	let forceNewExploration = $state(false);
	
	// Drawer state
	let detailsPanelOpen = $state(false);
	let selectedNodeData = $state<any>(null);

	// Extract parameters from URL
	$effect(() => {
		const searchParams = $page.url.searchParams;
		const newTopic = searchParams.get('topic') || '';
		const newUrl = searchParams.get('url') || '';
		const resumeFlag = searchParams.get('resume') === 'true';
		
		// Only initialize if parameters actually changed and we haven't initialized yet
		if ((newTopic !== topic || newUrl !== url) || !hasInitialized) {
			topic = newTopic;
			url = newUrl;
			
			// Set initial display title
			if (newTopic && !resumeFlag) {
				// For new topics, the topic parameter is the title
				displayTitle = newTopic;
			} else if (newUrl) {
				// For URLs, show the domain
				displayTitle = new URL(newUrl).hostname;
			} else if (newTopic && resumeFlag) {
				// For resumed topics, we'll fetch the actual title in initializeMindMap
				displayTitle = 'Loading...';
			}
			
			// Initialize mind map when parameters change
			if (topic || url) {
				hasInitialized = true;
				initializeMindMap(resumeFlag);
			}
		}
	});

const initializeMindMap = async (resume = false) => {
		console.log('🚀 [UI] Starting mind map initialization...');
		
		// Reset state and show loading mind map immediately
		hasNodes = true; // Show content area immediately
		isLoading = false; // Don't show loading spinner
		error = '';
		
		// Set initial mind map with loading state
		mindMapData = {
			nodes: [{
				id: 'loading',
				type: 'topicNode',
				position: { x: 400, y: 300 },
				data: {
					label: displayTitle || 'Loading...',
					description: 'Generating mind map...',
					level: 0,
					isMainTopic: true,
					isLoading: true
				}
			}],
			edges: [],
			isStreaming: true,
			currentStep: 'Initializing...'
		};
		
		try {
			// Use ErrorRecovery for robust error handling
			await ErrorRecovery.withAIServiceRecovery(
				`mindmap-init-${topic || url}`,
				() => {
					// Initial loading state already applied above
				},
				async () => {
					// Create lifecycle-bound AbortController so navigation/cancel stops work
					const controller = new AbortController();
					const signal = controller.signal;
					// Cancel on page unload/navigation (best-effort in SPA)
					addEventListener('beforeunload', () => controller.abort(), { once: true });

					if (topic) {
						if (resume) {
							// Topic is actually a topic ID - load existing mind map
							console.log(`🔄 [UI] Resuming existing topic: "${topic}"`);
							const existingMindMap = await loadTopicMindMap(topic);
							
							if (existingMindMap) {
								console.log(`✅ [UI] Loaded existing mind map with ${existingMindMap.nodes.length} nodes`);
								// Get topic details to set proper display title
								const topicDetails = await TopicsService.getTopicById(topic);
								if (topicDetails) {
									displayTitle = topicDetails.title;
								}
								handleStreamingProgress(existingMindMap);
							} else {
								// Fallback: get topic details and create new mind map
								console.log(`⚠️ [UI] No mind map found for topic ID: ${topic}, loading topic details`);
								const topicDetails = await TopicsService.getTopicById(topic);
								if (topicDetails) {
									// Update display title with actual topic title
									displayTitle = topicDetails.title;
									console.log(`📝 [UI] Found topic details, creating new mind map for: "${topicDetails.title}"`);
									const result = await analyzeTopicStreamingWithPersistence(topicDetails.title, handleStreamingProgress, { forceNew: forceNewExploration }, signal);
									
									if (typeof result === 'object' && result.isDuplicate) {
										handleDuplicateDetected(result.existingTopic, 'topic');
										return;
									}
								} else {
									throw new Error('Topic not found');
								}
							}
						} else {
							// Topic is a topic name - check for duplicates or create new mind map
							console.log(`📝 [UI] Processing new topic with persistence: "${topic}"`);
							const result = await analyzeTopicStreamingWithPersistence(topic, handleStreamingProgress, { forceNew: forceNewExploration }, signal);
							
							if (typeof result === 'object' && result.isDuplicate) {
								handleDuplicateDetected(result.existingTopic, 'topic');
								return;
							}
						}
					} else if (url) {
						console.log(`🔗 [UI] Processing URL with persistence: "${url}"`);
						const result = await analyzeUrlStreamingWithPersistence(url, handleStreamingProgress, { forceNew: forceNewExploration }, signal);
						
						if (typeof result === 'object' && result.isDuplicate) {
							handleDuplicateDetected(result.existingTopic, 'url');
							return;
						}
					}
					
					console.log('✅ [UI] Progressive mind map generation completed successfully');
				},
				() => {
					// Rollback: Show error state
					hasNodes = false;
					isLoading = false;
				}
			);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to generate mind map';
			
			// Check for specific error types to provide better user feedback
			if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
				error = 'Unable to connect to AI service. Please check your internet connection and try again.';
			} else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
				error = 'AI service configuration error. Please check the setup.';
			} else if (errorMessage.includes('Topic not found')) {
				error = 'The requested topic could not be found. It may have been deleted.';
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

		// Ensure we show the mind map
		hasNodes = true;

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
			const currentLanguage = get(aiLanguage);
			const breakdown = await analyzeTopic(topicName, currentLanguage);
			
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
			const currentLanguage = get(aiLanguage);
			const analysis = await analyzeUrl(urlString, currentLanguage);
			
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

	// Drawer handlers
	const handleCloseDetails = () => {
		detailsPanelOpen = false;
		selectedNodeData = null;
	};

	const handleStartChat = (event: CustomEvent) => {
		// TODO: Implement chat functionality
		console.log('Start chat for:', event.detail.topic);
	};

	// Duplicate topic handlers
	function handleDuplicateDetected(existingTopic: any, analysisType: 'topic' | 'url') {
		console.log('🔄 [UI] Duplicate topic detected, showing modal');
		duplicateTopicInfo = existingTopic;
		pendingAnalysisType = analysisType;
		showDuplicateModal = true;
		
		// Reset UI state to show the modal properly
		hasNodes = false;
		isLoading = false;
	}

	async function handleContinuePrevious() {
		console.log('🔄 [UI] User chose to continue previous exploration');
		
		if (duplicateTopicInfo) {
			// Small delay to show loading state before navigation
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Navigate to resume the existing topic
			window.location.href = `/explore?topic=${duplicateTopicInfo.id}&resume=true`;
		}
	}

	async function handleStartNewExploration() {
		console.log('🆕 [UI] User chose to start new exploration');
		
		// Set flag to force new exploration and restart the analysis
		forceNewExploration = true;
		hasInitialized = false;
		
		// Close modal and show loading state immediately
		showDuplicateModal = false;
		
		// Show immediate loading state
		hasNodes = true;
		isLoading = false;
		error = '';
		
		// Set initial mind map with loading state
		mindMapData = {
			nodes: [{
				id: 'loading',
				type: 'topicNode',
				position: { x: 400, y: 300 },
				data: {
					label: displayTitle || 'Loading...',
					description: 'Starting fresh exploration...',
					level: 0,
					isMainTopic: true,
					isLoading: true
				}
			}],
			edges: [],
			isStreaming: true,
			currentStep: 'Starting fresh exploration...'
		};
		
		// Start the mind map initialization
		await initializeMindMap();
	}

	function handleCloseDuplicateModal() {
		console.log('❌ [UI] User closed duplicate modal');
		showDuplicateModal = false;
		duplicateTopicInfo = null;
		pendingAnalysisType = null;
		
		// Navigate back to home or previous page
		handleBackToHome();
	}
</script>

<svelte:head>
	<title>Explore {displayTitle || 'Content'} - Explore.fyi</title>
	<meta name="description" content="Interactive mind map exploration of {displayTitle || 'web content'} powered by AI" />
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
					{#if displayTitle}
						<div class="flex items-center space-x-2">
							{#if topic}
								<Brain class="h-4 w-4 text-zinc-500" />
							{:else if url}
								<ExternalLink class="h-4 w-4 text-zinc-500" />
							{/if}
							<span class="text-sm font-medium text-zinc-900">{displayTitle}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main content area with flex layout for drawer -->
	<main class="relative h-[calc(100vh-140px)]">
		{#if error}
			<!-- Error state -->
			<div class="flex flex-col items-center justify-center h-full">
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
			<!-- Mind map visualization with push-style drawer -->
			<div class="relative h-full overflow-hidden">
				<!-- Mind map canvas - gets pushed left when drawer opens -->
				<div 
					class="absolute inset-0 transition-transform duration-300 ease-in-out {detailsPanelOpen ? '-translate-x-1/2' : ''}"
				>
					<MindMap data={mindMapData} bind:detailsPanelOpen bind:selectedNodeData />
				</div>
				
				<!-- Push-style details drawer - slides in from right -->
				<div 
					class="absolute top-0 right-0 w-1/2 h-full bg-white border-l border-zinc-200 transition-transform duration-300 ease-in-out {!detailsPanelOpen ? 'translate-x-full' : ''}"
				>
					<InlineNodeDetailsPanel 
						open={detailsPanelOpen}
						nodeData={selectedNodeData}
						onclose={handleCloseDetails}
						onstartchat={handleStartChat}
					/>
				</div>
			</div>
		{/if}
	</main>
</div>

<!-- Duplicate Topic Modal -->
<DuplicateTopicModal
	bind:open={showDuplicateModal}
	topicTitle={displayTitle || ''}
	existingTopic={duplicateTopicInfo}
	onContinue={handleContinuePrevious}
	onStartNew={handleStartNewExploration}
	onClose={handleCloseDuplicateModal}
/>
