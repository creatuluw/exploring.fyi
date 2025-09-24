<script lang="ts">
	import { onMount } from 'svelte';
	import { Clock, Brain, TrendingUp, BookOpen, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, MoreVertical, PlayCircle, CheckCircle, BarChart } from 'lucide-svelte';
	import { session } from '$lib/stores/session.js';
	import { TopicsService } from '$lib/database/topics.js';
	import { ProgressService } from '$lib/database/progress.js';
	import { getTopicHistory, loadTopicMindMap } from '$lib/services/topicAnalysisWithPersistence.js';
	import { TopicResumptionService, type TopicResumptionInfo } from '$lib/services/topicResumption.js';
	import TopicActionsModal from './TopicActionsModal.svelte';
	import { dbHelpers, supabase } from '$lib/database/supabase.js';

	// State
	let isLoading = $state(true);
	let topics = $state<any[]>([]);
	let topicResumptionInfo = $state<Map<string, TopicResumptionInfo>>(new Map());
	let progressSummary = $state<any>(null);
	let searchQuery = $state('');
	let selectedFilter = $state<'all' | 'recent' | 'completed'>('all');
	
	// Modal state
	let showActionsModal = $state(false);
	let selectedTopic = $state<any>(null);
	
	// Pagination state
	let currentPage = $state(1);
	const itemsPerPage = 20; // 4 columns × 5 rows

	// Computed
	let filteredTopics = $derived.by(() => {
		console.log('🔍 [Filter] Starting to filter topics...');
		console.log('🔍 [Filter] Input topics:', topics);
		console.log('🔍 [Filter] Search query:', searchQuery);
		console.log('🔍 [Filter] Selected filter:', selectedFilter);
		
		let filtered = topics;

		// Apply search filter
		if (searchQuery.trim()) {
			console.log('🔍 [Filter] Applying search filter...');
			filtered = filtered.filter(topic => 
				topic.title.toLowerCase().includes(searchQuery.toLowerCase())
			);
			console.log('🔍 [Filter] After search filter:', filtered);
		}

		// Apply status filter
		switch (selectedFilter) {
			case 'recent':
				console.log('🔍 [Filter] Applying recent filter...');
				const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				filtered = filtered.filter(topic => 
					new Date(topic.created_at) > oneDayAgo
				);
				console.log('🔍 [Filter] After recent filter:', filtered);
				break;
			case 'completed':
				console.log('🔍 [Filter] Applying completed filter...');
				filtered = filtered.filter(topic => topic.mindMap?.nodeCount > 5);
				console.log('🔍 [Filter] After completed filter:', filtered);
				break;
		}

		console.log('🔍 [Filter] Final filtered topics:', filtered);
		return filtered;
	});

	// Pagination computed
	let totalPages = $derived(Math.ceil(filteredTopics.length / itemsPerPage));
	let paginatedTopics = $derived.by(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredTopics.slice(startIndex, endIndex);
	});

	// Reset to first page when filters change
	$effect(() => {
		// This effect runs when searchQuery or selectedFilter changes
		searchQuery;
		selectedFilter;
		currentPage = 1;
	});

	// Load data
	onMount(async () => {
		await loadHistoryData();
	});

	async function loadHistoryData() {
		try {
			console.log('🔄 [History] Starting to load history data...');
			isLoading = true;
			
			// Load ALL topics from database (not just current session)
			const loadedTopics = await getAllTopicsFromDatabase();
			topics = loadedTopics;
			console.log('📊 [History] Loaded topics:', topics);
			console.log('📊 [History] Topics count:', topics.length);
			
			// Load resumption analysis for each topic
			if (TopicResumptionService.canAccessProgress()) {
				console.log('🔍 [History] Loading resumption analysis for topics...');
				const resumptionMap = new Map<string, TopicResumptionInfo>();
				
				for (const topic of loadedTopics) {
					try {
						const resumptionInfo = await TopicResumptionService.analyzeTopicForResumption(topic.id);
						resumptionMap.set(topic.id, resumptionInfo);
						console.log(`📊 [History] Resumption analysis for ${topic.id}:`, resumptionInfo);
					} catch (error) {
						console.warn(`⚠️ [History] Failed to analyze resumption for topic ${topic.id}:`, error);
					}
				}
				
				topicResumptionInfo = resumptionMap;
				console.log('✅ [History] Completed resumption analysis for all topics');
			}
			
			// Load progress summary for current session if available
			if ($session.id) {
				console.log('🔍 [History] Loading progress summary for session:', $session.id);
				progressSummary = await ProgressService.getProgressSummary($session.id);
				console.log('📈 [History] Progress summary:', progressSummary);
			} else {
				console.log('⚠️ [History] No session ID available for progress summary');
			}

		} catch (error) {
			console.error('❌ [History] Failed to load history data:', error);
		} finally {
			isLoading = false;
			console.log('✅ [History] History data loading completed');
		}
	}

	// Function to get ALL topics from database regardless of session
	async function getAllTopicsFromDatabase() {
		try {
			console.log('🔍 [DB] Starting to fetch all topics from database...');
			const { supabase } = await import('$lib/database/supabase.js');
			const { MindMapsService } = await import('$lib/database/mindMaps.js');
			
			// Get all topics from database
			const { data: allTopics, error } = await supabase
				.from('topics')
				.select(`
					id,
					session_id,
					title,
					source_url,
					source_type,
					mind_map_data,
					created_at,
					updated_at
				`)
				.order('created_at', { ascending: false });
			
			if (error) {
				console.error('❌ [DB] Error fetching all topics:', error);
				return [];
			}
			
			console.log(`📋 [DB] Found ${allTopics.length} topics in database:`, allTopics);
			
			// Log each topic individually for easier debugging
			allTopics.forEach((topic, index) => {
				console.log(`📄 [DB] Topic ${index + 1}: "${topic.title}"`);
				console.log(`   - ID: ${topic.id}`);
				console.log(`   - Session: ${topic.session_id}`);
				console.log(`   - Type: ${topic.source_type}`);
				console.log(`   - Mind Map Data:`, topic.mind_map_data);
				console.log(`   - Created: ${topic.created_at}`);
			});
			
			// Enhance with mind map details
			console.log('🔗 [DB] Enhancing topics with mind map details...');
			const enhancedTopics = await Promise.all(
				allTopics.map(async (topic, index) => {
					let mindMapDetails = null;
					
					console.log(`🧠 [DB] Processing mind map for topic ${index + 1}: "${topic.title}"`);
					
					if (topic.mind_map_data && topic.mind_map_data.mindMapId) {
						try {
							console.log(`   - Looking for mind map ID: ${topic.mind_map_data.mindMapId}`);
							const { data: mindMap } = await supabase
								.from('mind_maps')
								.select('*')
								.eq('id', topic.mind_map_data.mindMapId)
								.single();
							
							if (mindMap) {
								mindMapDetails = {
									id: mindMap.id,
									nodeCount: mindMap.nodes.length,
									edgeCount: mindMap.edges.length,
									lastUpdated: mindMap.updated_at
								};
								console.log(`   ✅ Found mind map:`, mindMapDetails);
								console.log(`   📊 Nodes (${mindMap.nodes.length}):`, mindMap.nodes);
								console.log(`   🔗 Edges (${mindMap.edges.length}):`, mindMap.edges);
							} else {
								console.log(`   ❌ Mind map not found for ID: ${topic.mind_map_data.mindMapId}`);
							}
						} catch (error) {
							console.warn(`   ⚠️ Failed to load mind map for topic ${topic.id}:`, error);
						}
					} else {
						console.log(`   ℹ️ No mind map data available`);
					}
					
					const enhancedTopic = {
						...topic,
						mindMap: mindMapDetails
					};
					
					console.log(`   📋 Enhanced topic:`, enhancedTopic);
					return enhancedTopic;
				})
			);
			
			console.log(`✅ [DB] Enhanced ${enhancedTopics.length} topics with mind map data`);
			console.log(`📊 [DB] Final enhanced topics:`, enhancedTopics);
			return enhancedTopics;
			
		} catch (error) {
			console.error('❌ [DB] Failed to get all topics from database:', error);
			return [];
		}
	}

	// Actions
	async function resumeTopic(topicId: string) {
		try {
			// Get topic details to find the associated mindmap
			const topic = await TopicsService.getTopicById(topicId);
			if (topic && topic.mind_map_data && topic.mind_map_data.mindMapId) {
				// Get the mindmap to access its slug
				const { data: mindMap } = await supabase
					.from('mind_maps')
					.select('slug')
					.eq('id', topic.mind_map_data.mindMapId)
					.single();
				
				if (mindMap && mindMap.slug) {
					// Navigate directly to mindmap using slug
					window.location.href = `/mindmap/${mindMap.slug}`;
					return;
				}
			}
			
			// Fallback: navigate to explore page with topic slug/ID
			if (topic && topic.slug) {
				window.location.href = `/explore?topic=${topic.slug}&resume=true`;
			} else {
				window.location.href = `/explore?topic=${topicId}&resume=true`;
			}
		} catch (error) {
			console.error('❌ [History] Error getting topic/mindmap for navigation:', error);
			// Fallback to ID-based navigation
			window.location.href = `/explore?topic=${topicId}&resume=true`;
		}
	}

	async function viewTopicDetails(topicId: string) {
		// Use smart resumption to determine best navigation
		try {
			const resumptionInfo = await TopicResumptionService.analyzeTopicForResumption(topicId);
			// Extract slug from topic ID for URL routing
			const topicSlug = dbHelpers.extractTopicSlug(topicId) || topicId;
			const smartUrl = TopicResumptionService.getSmartNavigationUrl(topicSlug, resumptionInfo);
			window.location.href = smartUrl;
		} catch (error) {
			console.error('❌ [History] Error analyzing topic for smart resumption:', error);
			// Fallback to direct navigation with slug
			const topicSlug = dbHelpers.extractTopicSlug(topicId) || topicId;
			window.location.href = `/topic/${topicSlug}`;
		}
	}

	async function continueReading(topicId: string) {
		// Direct smart navigation optimized for continuation
		try {
			const resumptionInfo = await TopicResumptionService.analyzeTopicForResumption(topicId);
			
			if (resumptionInfo.hasProgress) {
				// Extract slug from topic ID for URL routing
				const topicSlug = dbHelpers.extractTopicSlug(topicId) || topicId;
				const smartUrl = TopicResumptionService.getSmartNavigationUrl(topicSlug, resumptionInfo);
				window.location.href = smartUrl;
			} else {
				// No progress yet, go to content directly with slug
				const topicSlug = dbHelpers.extractTopicSlug(topicId) || topicId;
				window.location.href = `/topic/${topicSlug}`;
			}
		} catch (error) {
			console.error('❌ [History] Error continuing reading:', error);
			// Fallback with slug
			const topicSlug = dbHelpers.extractTopicSlug(topicId) || topicId;
			window.location.href = `/topic/${topicSlug}`;
		}
	}

	function formatTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
		return 'Just now';
	}

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		
		if (hours > 0) return `${hours}h ${minutes}m`;
		if (minutes > 0) return `${minutes}m`;
		return '<1m';
	}

	// Pagination functions
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	// Modal handlers
	function handleTopicActions(topic: any) {
		selectedTopic = topic;
		showActionsModal = true;
	}

	function handleCloseModal() {
		showActionsModal = false;
		selectedTopic = null;
	}

	function handleTopicDeleted() {
		// Refresh the topics list
		loadHistoryData();
		handleCloseModal();
	}
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-zinc-900 mb-2">Your Learning Journey</h1>
		<p class="text-zinc-600">Track your exploration history, resume mind maps, and monitor progress</p>
	</div>

	<!-- Summary Stats -->
	{#if progressSummary}
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-lg border border-zinc-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-zinc-600">Topics Explored</p>
						<p class="text-2xl font-bold text-zinc-900">{progressSummary.topics_explored}</p>
					</div>
					<Brain class="h-8 w-8 text-blue-500" />
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-zinc-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-zinc-600">Time Spent</p>
						<p class="text-2xl font-bold text-zinc-900">{formatDuration(progressSummary.total_time_spent_seconds)}</p>
					</div>
					<Clock class="h-8 w-8 text-green-500" />
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-zinc-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-zinc-600">Completion Rate</p>
						<p class="text-2xl font-bold text-zinc-900">{Math.round(progressSummary.completion_percentage)}%</p>
					</div>
					<TrendingUp class="h-8 w-8 text-purple-500" />
				</div>
			</div>
			
			<div class="bg-white rounded-lg border border-zinc-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-zinc-600">Content Sections</p>
						<p class="text-2xl font-bold text-zinc-900">{progressSummary.completed_sections}/{progressSummary.total_sections}</p>
					</div>
					<BookOpen class="h-8 w-8 text-orange-500" />
				</div>
			</div>
		</div>
	{/if}

	<!-- Search and Filters -->
	<div class="bg-white rounded-lg border border-zinc-200 p-6 mb-8">
		<div class="flex flex-col sm:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search your topics..."
					class="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			
			<!-- Filter -->
			<div class="flex gap-2">
				<button
					onclick={() => selectedFilter = 'all'}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					All Topics
				</button>
				<button
					onclick={() => selectedFilter = 'recent'}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedFilter === 'recent' ? 'bg-blue-100 text-blue-700' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					Recent
				</button>
				<button
					onclick={() => selectedFilter = 'completed'}
					class="px-4 py-2 text-sm font-medium rounded-md transition-colors {selectedFilter === 'completed' ? 'bg-blue-100 text-blue-700' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					Completed
				</button>
			</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			<span class="ml-3 text-zinc-600">Loading your history...</span>
		</div>
	{/if}

	<!-- Topics Cards Grid -->
	{#if !isLoading && paginatedTopics.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
			{#each paginatedTopics as topic (topic.id)}
				{@const resumption = topicResumptionInfo.get(topic.id)}
				<article class="flex flex-col h-full border border-transparent [background:linear-gradient(var(--color-white),var(--color-zinc-50))_padding-box,linear-gradient(120deg,var(--color-zinc-300),var(--color-zinc-100),var(--color-zinc-300))_border-box] rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
					<div class="flex flex-col h-full p-5">
						<!-- Header with icons and actions -->
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center space-x-2">
								{#if topic.source_type === 'url'}
									<ExternalLink class="w-4 h-4 text-zinc-400" />
								{:else if topic.source_type === 'text'}
									<BookOpen class="w-4 h-4 text-zinc-400" />
								{:else}
									<Brain class="w-4 h-4 text-zinc-400" />
								{/if}
								<span class="text-xs font-medium text-zinc-500 uppercase tracking-wide">
									{topic.source_type}
								</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="text-xs text-zinc-400">
									{formatTimeAgo(topic.created_at)}
								</div>
								<button
									onclick={(e) => { e.stopPropagation(); handleTopicActions(topic); }}
									class="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
									title="Topic actions"
								>
									<MoreVertical class="w-4 h-4" />
								</button>
							</div>
						</div>

						<!-- Title -->
						<h3 class="font-semibold text-zinc-900 mb-3 line-clamp-2 flex-shrink-0">
							{topic.title}
						</h3>

						<!-- Stats -->
						<div class="mb-4">
							{#if resumption?.hasExistingContent}
								<!-- Progress information -->
								<div class="flex items-center gap-4 text-xs text-zinc-500 mb-2">
									<div class="flex items-center gap-1">
										<BarChart class="w-3 h-3" />
										<span>{resumption.overallProgress}% read</span>
									</div>
									{#if resumption.completedChapters > 0}
										<div class="flex items-center gap-1">
											<CheckCircle class="w-3 h-3" />
											<span>{resumption.completedChapters}/{resumption.totalChapters} chapters</span>
										</div>
									{:else}
										<div class="flex items-center gap-1">
											<BookOpen class="w-3 h-3" />
											<span>{resumption.readParagraphs}/{resumption.totalParagraphs} paragraphs</span>
										</div>
									{/if}
								</div>
								
								<!-- Progress bar -->
								{#if resumption.overallProgress > 0}
									<div class="w-full bg-zinc-200 rounded-full h-1.5 mb-2">
										<div 
											class="h-1.5 rounded-full transition-all duration-300 {resumption.overallProgress === 100 ? 'bg-green-500' : 'bg-blue-500'}"
											style="width: {resumption.overallProgress}%"
										></div>
									</div>
								{/if}
								
								<!-- Status text -->
								<div class="text-xs text-zinc-600">
									{TopicResumptionService.getProgressDescription(resumption)}
								</div>
							{:else if topic.mindMap}
								<!-- Legacy mind map stats -->
								<div class="flex items-center gap-4 text-xs text-zinc-500">
									<div class="flex items-center gap-1">
										<Brain class="w-3 h-3" />
										<span>{topic.mindMap.nodeCount} nodes</span>
									</div>
									<div class="flex items-center gap-1">
										<TrendingUp class="w-3 h-3" />
										<span>{topic.mindMap.edgeCount} connections</span>
									</div>
								</div>
							{:else}
								<!-- No content yet -->
								<div class="flex items-center gap-1 text-xs text-zinc-500">
									<Clock class="w-3 h-3" />
									<span>Not explored</span>
								</div>
							{/if}
						</div>

						<!-- Source URL (if available) -->
						{#if topic.source_url}
							<div class="text-xs text-blue-600 mb-4 truncate">
								<a href={topic.source_url} target="_blank" class="hover:underline" title={topic.source_url}>
									{new URL(topic.source_url).hostname}
								</a>
							</div>
						{/if}


						<!-- Smart Actions -->
						<div class="mt-auto flex gap-2">
							{#if resumption?.hasExistingContent}
								{#if resumption.hasProgress && resumption.overallProgress < 100}
									<!-- Continue Reading - Primary action for topics with progress -->
									<button
										onclick={() => continueReading(topic.id)}
										class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
									>
										<PlayCircle class="h-3 w-3" />
										Continue Reading
									</button>
								{:else if resumption.overallProgress === 100}
									<!-- Completed topic -->
									<button
										onclick={() => viewTopicDetails(topic.id)}
										class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
									>
										<CheckCircle class="h-3 w-3" />
										Review
									</button>
								{:else}
									<!-- No progress yet -->
									<button
										onclick={() => continueReading(topic.id)}
										class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
									>
										<BookOpen class="h-3 w-3" />
										Start Reading
									</button>
								{/if}
								
								<!-- Mind Map option (secondary) -->
								{#if topic.mindMap}
									<button
										onclick={() => resumeTopic(topic.id)}
										class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-zinc-600 bg-zinc-50 rounded-md hover:bg-zinc-100 transition-colors"
									>
										<Brain class="h-3 w-3" />
										Mind Map
									</button>
								{/if}
							{:else}
								<!-- Legacy actions for topics without chapter content -->
								<button
									onclick={() => resumeTopic(topic.id)}
									class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
								>
									<Brain class="h-3 w-3" />
									Mindmap
								</button>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between">
				<div class="text-sm text-zinc-500">
					Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTopics.length)} of {filteredTopics.length} topics
				</div>

				<div class="flex items-center space-x-2">
					<button
						onclick={prevPage}
						disabled={currentPage === 1}
						class="p-2 text-zinc-500 hover:text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronLeft class="w-4 h-4" />
					</button>

					<!-- Page numbers -->
					<div class="flex space-x-1">
						{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
							const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
							return pageNumber;
						}) as pageNumber}
							{#if pageNumber <= totalPages}
								<button
									onclick={() => goToPage(pageNumber)}
									class="px-3 py-1 text-sm rounded-md transition-colors {currentPage === pageNumber 
										? 'bg-blue-600 text-white' 
										: 'text-zinc-600 hover:bg-zinc-100'}"
								>
									{pageNumber}
								</button>
							{/if}
						{/each}
					</div>

					<button
						onclick={nextPage}
						disabled={currentPage === totalPages}
						class="p-2 text-zinc-500 hover:text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronRight class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/if}
	{/if}


	<!-- Empty State -->
	{#if !isLoading && filteredTopics.length === 0}
		<div class="text-center py-12">
			<Brain class="mx-auto h-12 w-12 text-zinc-400 mb-4" />
			<h3 class="text-lg font-medium text-zinc-900 mb-2">
				{searchQuery ? 'No topics found' : 'No topics explored yet'}
			</h3>
			<p class="text-zinc-600 mb-6">
				{searchQuery ? 'Try adjusting your search terms or filters' : 'Start exploring topics to build your learning history'}
			</p>
			{#if !searchQuery}
				<a href="/" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
					<Brain class="h-4 w-4" />
					Start Exploring
				</a>
			{/if}
		</div>
	{/if}
</div>

<!-- Topic Actions Modal -->
<TopicActionsModal
	bind:open={showActionsModal}
	topic={selectedTopic}
	onclose={handleCloseModal}
	ondeleted={handleTopicDeleted}
/>
