<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Brain, Clock, Star, BookOpen, Target, Lightbulb, Loader2, Menu, X, RefreshCw, Wifi, WifiOff } from 'lucide-svelte';
	import { TopicResumptionService, type TopicResumptionInfo } from '$lib/services/topicResumption.js';
	import type { ChapterWithParagraphs, ParagraphRecord } from '$lib/types/index.js';
	import { session } from '$lib/stores/session.js';
	import { contentCache, cacheStats } from '$lib/stores/contentCache.js';
	import { backgroundSync } from '$lib/services/backgroundSync.js';
	import { get } from 'svelte/store';
	import ProgressiveContentSection from '$lib/components/ProgressiveContentSection.svelte';
	import Drawer from '$lib/components/Drawer.svelte';

	interface PageData {
		topicId: string;
		topic: string;
		context?: string;
		enhancedContext?: {
			mainTopic?: {
				title: string;
				description: string;
			};
			nodeInfo?: {
				description: string;
				level: number;
				importance: string;
				connections: string[];
				parentId: string;
			};
		};
		difficulty: 'beginner' | 'intermediate' | 'advanced';
		topicData?: any;
		resumption?: {
			isResumption: boolean;
			progress: number | null;
			targetChapterId: string | null;
			targetParagraphId: string | null;
		};
	}

	let { data }: { data: PageData } = $props();
	
	// ToC generation state
	let tocGenerating = $state(false);
	let tocComplete = $state(false);
	let chapters = $state<ChapterWithParagraphs[]>([]);
	let error = $state('');

	// Resumption state
	let resumptionInfo = $state<TopicResumptionInfo | null>(null);
	let showWelcomeBack = $state(false);

	// Drawer state
	let drawerOpen = $state(false);
	
	// Cache and sync state
	let fromCache = $state(false);
	let syncStatus = $state('unknown');
	let isOnline = $state(true);
	
	// Computed values
	const topicId = $derived(data.topicId);
	const topicTitle = $derived(data.topic);
	const totalChapters = $derived(chapters.length);
	const totalParagraphs = $derived(chapters.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0));

	// Component refs for updating paragraph content
	let progressiveSectionRefs = $state<Record<string, any>>({});

	onMount(async () => {
		// Initialize background sync
		backgroundSync.start();
		
		// Monitor online status
		isOnline = backgroundSync.isServiceOnline();
		
		await initializeToC();
	});
	
	onDestroy(() => {
		// Stop background sync when component is destroyed
		backgroundSync.stop();
	});

	/**
	 * Initialize ToC generation
	 */
	async function initializeToC() {
		if (!topicId || !topicTitle) return;

		try {
			tocGenerating = true;
			error = '';
			
			console.log(`📚 [Progressive Topic] Initializing ToC for: "${topicTitle}"`);

			// First, check if we have cached content
			const cachedContent = contentCache.getCachedTopicContent(topicId);
			if (cachedContent) {
				console.log(`✅ [Progressive Topic] Loading from cache: "${topicTitle}"`);
				chapters = cachedContent.chapters;
				fromCache = true;
				tocComplete = true;
				tocGenerating = false;
				
				// If we have a target chapter/paragraph, scroll to it
				if (data.resumption?.targetChapterId) {
					setTimeout(() => scrollToTargetContent(), 1000);
				}
				
				return;
			}

			// If this is a resumption, analyze progress first
			if (data.resumption?.isResumption && TopicResumptionService.canAccessProgress()) {
				try {
					resumptionInfo = await TopicResumptionService.analyzeTopicForResumption(topicId);
					
					if (resumptionInfo.hasProgress) {
						showWelcomeBack = true;
						// Hide welcome banner after 10 seconds
						setTimeout(() => { showWelcomeBack = false; }, 10000);
					}
					
					console.log(`📊 [Progressive Topic] Resumption analysis complete:`, resumptionInfo);
				} catch (error) {
					console.warn('⚠️ [Progressive Topic] Failed to analyze resumption, continuing normally');
				}
			}

		// Try to get existing ToC first using API endpoint
		try {
			const existingResponse = await fetch(`/api/generate-toc-fixed?topicId=${encodeURIComponent(topicId)}&topic=${encodeURIComponent(topicTitle)}`);
			if (existingResponse.ok) {
				const existingResult = await existingResponse.json();
				if (existingResult.success && existingResult.data.chapters?.length > 0) {
					console.log(`ℹ️ [Progressive Topic] Found existing ToC with ${existingResult.data.chapters.length} chapters`);
					chapters = existingResult.data.chapters;
					tocComplete = true;
					tocGenerating = false;
					
					// If we have a target chapter/paragraph, scroll to it after a brief delay
					if (data.resumption?.targetChapterId) {
						setTimeout(() => scrollToTargetContent(), 1000);
					}
					
					return;
				}
			}
		} catch (error) {
			console.warn('⚠️ [Progressive Topic] Failed to check for existing ToC, proceeding with generation');
		}

		// Get session ID for the API call
		const sessionState = get(session);
		if (!sessionState?.id) {
			error = 'No active session - cannot generate content';
			return;
		}

		// Generate new ToC using fixed API endpoint
		console.log(`🤖 [Progressive Topic] Generating new ToC...`);
		const response = await fetch('/api/generate-toc-fixed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					topicId,
					topic: topicTitle,
					sessionId: sessionState.id,
					options: {
						difficulty: data.difficulty || 'intermediate',
						maxChapters: 6,
						context: data.context,
						nodeDescription: data.enhancedContext?.nodeInfo?.description
					}
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || 'Failed to generate ToC');
			}

			const generatedChapters = result.data.chapters;

			chapters = generatedChapters;
			tocComplete = true;
			fromCache = false;
			
			// Cache the generated content
			contentCache.cacheTopicContent(topicId, topicTitle, generatedChapters, {
				difficulty: data.difficulty,
				context: data.context,
				enhancedContext: data.enhancedContext,
				sessionId: get(session)?.id || undefined
			});
			
			console.log(`✅ [Progressive Topic] ToC generated successfully with ${generatedChapters.length} chapters`);

		} catch (err) {
			console.error('❌ [Progressive Topic] ToC generation failed:', err);
			error = err instanceof Error ? err.message : 'Failed to generate table of contents';
		} finally {
			tocGenerating = false;
		}
	}

	/**
	 * Scroll to target content if specified in resumption parameters
	 */
	function scrollToTargetContent() {
		if (data.resumption?.targetChapterId) {
			const chapterElement = document.getElementById(`chapter-${data.resumption.targetChapterId}`);
			if (chapterElement) {
				chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
				console.log(`📍 [Progressive Topic] Scrolled to target chapter: ${data.resumption.targetChapterId}`);
			}
		}
		
		if (data.resumption?.targetParagraphId) {
			// Allow for chapter to load first, then scroll to paragraph
			setTimeout(() => {
				const paragraphElement = document.getElementById(`paragraph-${data.resumption!.targetParagraphId}`);
				if (paragraphElement) {
					paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
					console.log(`📍 [Progressive Topic] Scrolled to target paragraph: ${data.resumption!.targetParagraphId}`);
				}
			}, 500);
		}
	}

	/**
	 * Regenerate ToC (for user-initiated refresh)
	 */
	async function regenerateToC() {
		if (!topicId || !topicTitle) return;

		try {
			tocGenerating = true;
			tocComplete = false;
			chapters = [];
			error = '';

			console.log(`🔄 [Progressive Topic] Regenerating ToC for: "${topicTitle}"`);

		// Get session ID for the API call
		const sessionState = get(session);
		if (!sessionState?.id) {
			error = 'No active session - cannot regenerate content';
			return;
		}

		// Use fixed API endpoint for regeneration
		const response = await fetch('/api/generate-toc-fixed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					topicId,
					topic: topicTitle,
					sessionId: sessionState.id,
					options: {
						difficulty: data.difficulty || 'intermediate',
						maxChapters: 6,
						context: data.context,
						nodeDescription: data.enhancedContext?.nodeInfo?.description
					},
					forceRegenerate: true // Add flag to force regeneration
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || 'Failed to regenerate ToC');
			}

			const regeneratedChapters = result.data.chapters;

			chapters = regeneratedChapters;
			tocComplete = true;
			fromCache = false;
			
			// Update cache with regenerated content
			contentCache.cacheTopicContent(topicId, topicTitle, regeneratedChapters, {
				difficulty: data.difficulty,
				context: data.context,
				enhancedContext: data.enhancedContext,
				sessionId: get(session)?.id || undefined
			});
			
			console.log(`✅ [Progressive Topic] ToC regenerated successfully`);

		} catch (err) {
			console.error('❌ [Progressive Topic] ToC regeneration failed:', err);
			error = err instanceof Error ? err.message : 'Failed to regenerate table of contents';
		} finally {
			tocGenerating = false;
		}
	}

	/**
	 * Generate paragraph content on demand
	 */
	async function handleParagraphGeneration(
		paragraphId: string, 
		chapterTitle: string, 
		paragraphIndex: number, 
		paragraphSummary?: string
	) {
		try {
			console.log(`📝 [Progressive Topic] Generating paragraph ${paragraphIndex} in "${chapterTitle}"`);

			// Call the API to generate paragraph content
			const response = await fetch('/api/generate-paragraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					paragraphId,
					topicTitle,
					chapterTitle,
					paragraphIndex,
					paragraphSummary,
					options: {
						difficulty: data.difficulty || 'intermediate',
						language: 'en',
						maxWords: 300,
						includeExamples: true
					}
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.error || 'Failed to generate paragraph');
			}

			console.log(`✅ [Progressive Topic] Generated paragraph ${paragraphIndex}`);

			// Update the paragraph in our chapters state
			const chapterIndex = chapters.findIndex(ch => 
				ch.paragraphs.some(p => p.id === paragraphId)
			);
			
			if (chapterIndex >= 0) {
				const paragraphIndex = chapters[chapterIndex].paragraphs.findIndex(p => p.id === paragraphId);
				if (paragraphIndex >= 0) {
					// Update the paragraph with generated content
					const updatedParagraph = {
						...chapters[chapterIndex].paragraphs[paragraphIndex],
						content: result.data.content,
						summary: result.data.summary,
						metadata: result.data.metadata,
						isGenerated: true,
						generatedAt: result.data.generatedAt || new Date().toISOString()
					};
					
					chapters[chapterIndex].paragraphs[paragraphIndex] = updatedParagraph;
					
					// Trigger reactivity
					chapters = [...chapters];
					
					// Update cache with new paragraph content
					contentCache.updateCachedParagraph(
						topicId,
						chapters[chapterIndex].id,
						paragraphId,
						updatedParagraph
					);

					// Also update the progressive section component
					const chapterId = chapters[chapterIndex].id;
					if (progressiveSectionRefs[chapterId]) {
						progressiveSectionRefs[chapterId].updateGeneratedParagraph(
							paragraphId, 
							chapters[chapterIndex].paragraphs[paragraphIndex]
						);
					}
				}
			}

		} catch (err) {
			console.error('❌ [Progressive Topic] Paragraph generation failed:', err);
			throw err; // Re-throw to let the component handle the error
		}
	}

	/**
	 * Navigate back to parent topic's mind map
	 */
	async function goBack() {
		const { supabase } = await import('$lib/database/supabase.js');
		
		// First priority: Use enhanced context to find parent topic
		if (data.enhancedContext?.mainTopic?.title) {
			try {
				const parentTopicTitle = data.enhancedContext.mainTopic.title;
				console.log(`🔍 [Back Navigation] Looking for parent topic mindmap: "${parentTopicTitle}"`);
				
				// Search for the parent topic by title
				const { data: topics, error: topicsError } = await supabase
					.from('topics')
					.select(`
						id,
						title,
						mind_map_data
					`)
					.ilike('title', parentTopicTitle)
					.not('mind_map_data', 'is', null)
					.limit(1);
				
				if (topics && topics.length > 0 && topics[0].mind_map_data?.mindMapId) {
					const { data: mindMap, error: mindMapError } = await supabase
						.from('mind_maps')
						.select('slug')
						.eq('id', topics[0].mind_map_data.mindMapId)
						.single();
					
					if (mindMap && mindMap.slug) {
						console.log(`✅ [Back Navigation] Found parent topic mindmap: ${mindMap.slug}`);
						goto(`/mindmap/${mindMap.slug}`);
						return;
					}
				}
				
				console.warn(`⚠️ [Back Navigation] No mindmap found for parent topic: "${parentTopicTitle}"`);
			} catch (error) {
				console.warn('Failed to find parent topic mindmap:', error);
			}
		}
		
		// Second priority: Check if current topic has associated mindmap 
		if (data.topicData?.mind_map_data?.mindMapId) {
			try {
				console.log(`🔍 [Back Navigation] Looking for current topic mindmap with ID: ${data.topicData.mind_map_data.mindMapId}`);
				
				const { data: mindMap, error } = await supabase
					.from('mind_maps')
					.select('slug')
					.eq('id', data.topicData.mind_map_data.mindMapId)
					.single();
				
				if (mindMap && mindMap.slug) {
					console.log(`✅ [Back Navigation] Found current topic mindmap: ${mindMap.slug}`);
					goto(`/mindmap/${mindMap.slug}`);
					return;
				}
			} catch (error) {
				console.warn('Failed to get current topic mindmap:', error);
			}
		}
		
		// Third priority: Search by current topic title for any related mindmap
		if (data.topic) {
			try {
				console.log(`🔍 [Back Navigation] Searching for any mindmap containing: "${data.topic}"`);
				
				const { data: topics, error: topicsError } = await supabase
					.from('topics')
					.select(`
						id,
						title,
						mind_map_data
					`)
					.ilike('title', `%${data.topic}%`)
					.not('mind_map_data', 'is', null)
					.limit(5);
				
				if (topics && topics.length > 0) {
					// Try each topic until we find a valid mindmap
					for (const topic of topics) {
						if (topic.mind_map_data?.mindMapId) {
							const { data: mindMap, error: mindMapError } = await supabase
								.from('mind_maps')
								.select('slug')
								.eq('id', topic.mind_map_data.mindMapId)
								.single();
							
							if (mindMap && mindMap.slug) {
								console.log(`✅ [Back Navigation] Found related mindmap: ${mindMap.slug} (from topic: ${topic.title})`);
								goto(`/mindmap/${mindMap.slug}`);
								return;
							}
						}
					}
				}
			} catch (error) {
				console.warn('Failed to search for related mindmap:', error);
			}
		}
		
		// Last resort: go to home page
		console.log(`🏠 [Back Navigation] No mindmap found, navigating to home`);
		goto('/');
	}

	/**
	 * Open table of contents drawer
	 */
	function openTableOfContents() {
		drawerOpen = true;
	}
</script>

<svelte:head>
	<title>{topicTitle} - Learning Content | exploring.fyi</title>
	<meta name="description" content="Learn about {topicTitle} with AI-generated structured content." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
	<!-- Header -->
	<header class="bg-white border-b border-zinc-200 sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<!-- Back button and title -->
				<div class="flex items-center space-x-4">
					<button
						onclick={goBack}
						class="flex items-center px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
					>
						<ArrowLeft class="h-4 w-4 mr-2" />
						Back
					</button>
					<div class="border-l border-zinc-300 pl-4">
						<h1 class="text-lg font-semibold text-zinc-900 truncate max-w-96">
							{topicTitle}
						</h1>
						{#if data.enhancedContext?.mainTopic}
							<p class="text-sm text-zinc-600 truncate">
								Part of: {data.enhancedContext.mainTopic.title}
							</p>
						{/if}
					</div>
						</div>

				<!-- Actions -->
				<div class="flex items-center space-x-2">
					<!-- Cache and sync status -->
					{#if fromCache}
						<div class="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs" data-testid="cache-status">
							<svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
							</svg>
							Cached
						</div>
					{/if}
					
					<!-- Online status -->
					<div class="flex items-center px-2 py-1 {isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded text-xs">
						{#if isOnline}
							<Wifi class="h-3 w-3 mr-1" />
							Online
						{:else}
							<WifiOff class="h-3 w-3 mr-1" />
							Offline
						{/if}
					</div>
					
					{#if tocComplete}
						<button
							onclick={openTableOfContents}
							class="flex items-center px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
						>
							<Menu class="h-4 w-4 mr-2" />
							Contents
						</button>
						<button
							onclick={regenerateToC}
							disabled={tocGenerating}
							class="flex items-center px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<RefreshCw class="h-4 w-4 mr-2 {tocGenerating ? 'animate-spin' : ''}" />
							Regenerate
						</button>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Welcome Back Banner -->
	{#if showWelcomeBack && resumptionInfo}
		<div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
			<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-4">
						<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
							<BookOpen class="w-5 h-5 text-white" />
						</div>
						<div>
							<h3 class="font-semibold text-blue-900">Welcome back!</h3>
							<p class="text-sm text-blue-700">
								{TopicResumptionService.getProgressDescription(resumptionInfo)}
								{#if resumptionInfo.progressSummary.estimatedTimeRemaining > 0}
									• {TopicResumptionService.getTimeEstimateText(resumptionInfo.progressSummary.estimatedTimeRemaining)}
								{/if}
							</p>
							{#if resumptionInfo.nextUnreadChapter}
								<p class="text-xs text-blue-600 mt-1">
									📍 {TopicResumptionService.getRecommendedActionText(resumptionInfo)}
								</p>
							{/if}
						</div>
					</div>
					<button
						onclick={() => showWelcomeBack = false}
						class="p-1 text-blue-600 hover:text-blue-800 transition-colors"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main content -->
	<main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if error}
			<!-- Error state -->
			<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
				<div class="text-red-600 mb-4">
					<Target class="h-12 w-12 mx-auto mb-2" />
					<h3 class="text-lg font-semibold">Generation Failed</h3>
					</div>
				<p class="text-red-700 mb-4">{error}</p>
						<button 
					onclick={() => { error = ''; initializeToC(); }}
					class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						>
							Try Again
						</button>
					</div>
		{:else if tocGenerating}
			<!-- Loading state -->
			<div class="bg-white rounded-lg border border-zinc-200 p-12 text-center">
				<div class="flex items-center justify-center space-x-3 text-zinc-600 mb-4">
					<Loader2 class="h-8 w-8 animate-spin" />
					<Brain class="h-8 w-8" />
				</div>
				<h3 class="text-xl font-semibold text-zinc-900 mb-2">Generating Table of Contents</h3>
				<p class="text-zinc-600 max-w-md mx-auto">
					Our AI is analyzing "{topicTitle}" and creating a structured learning path with chapters and topics.
				</p>
			</div>
		{:else if tocComplete && chapters.length > 0}
			<!-- Content sections -->
			<div class="space-y-8">
				<!-- Topic overview -->
				<div class="bg-white rounded-lg border border-zinc-200 p-8" data-testid="learning-overview">
					<div class="flex items-center space-x-3 mb-4">
						<BookOpen class="h-6 w-6 text-blue-600" />
						<h2 class="text-xl font-semibold text-zinc-900">Learning Overview</h2>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div class="bg-zinc-50 rounded-lg p-4">
							<div class="text-zinc-600">Chapters</div>
							<div class="text-2xl font-bold text-zinc-900">{totalChapters}</div>
						</div>
						<div class="bg-zinc-50 rounded-lg p-4">
							<div class="text-zinc-600">Total Sections</div>
							<div class="text-2xl font-bold text-zinc-900">{totalParagraphs}</div>
						</div>
						<div class="bg-zinc-50 rounded-lg p-4">
							<div class="text-zinc-600">Difficulty</div>
							<div class="text-2xl font-bold text-zinc-900 capitalize">{data.difficulty}</div>
						</div>
					</div>
					<div class="mt-4 p-4 bg-blue-50 rounded-lg">
						<div class="flex items-start space-x-3">
							<Lightbulb class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
							<div class="text-sm text-blue-700">
								<strong>How it works:</strong> Content is generated progressively as you click "Explain" for each section. 
								This ensures focused learning and prevents information overload.
								{#if fromCache}
									<br><strong>📱 Loaded from cache:</strong> This content was previously generated and is now available offline.
								{/if}
							</div>
						</div>
											</div>
										</div>

				<!-- Progressive chapters -->
				{#each chapters as chapter}
					<div id="chapter-{chapter.id}">
						<ProgressiveContentSection
							bind:this={progressiveSectionRefs[chapter.id]}
							{chapter}
							{topicId}
							{topicTitle}
							onGenerateParagraph={handleParagraphGeneration}
						/>
					</div>
				{/each}
								</div>
		{:else}
			<!-- Empty state -->
			<div class="bg-white rounded-lg border border-zinc-200 p-12 text-center">
				<Target class="h-12 w-12 mx-auto mb-4 text-zinc-400" />
				<h3 class="text-lg font-semibold text-zinc-900 mb-2">No Content Available</h3>
				<p class="text-zinc-600">Unable to generate learning content for this topic.</p>
							</div>
						{/if}
	</main>

				<!-- Table of Contents Drawer -->
	{#if tocComplete}
				<Drawer
					open={drawerOpen}
					position="left"
					size="md"
					title="Table of Contents"
					showCloseButton={true}
					onclose={() => drawerOpen = false}
					contentClass="p-0"
				>
					{#snippet children()}
				<div class="p-6">
					<div class="space-y-4">
						{#each chapters as chapter, chapterIndex}
							<div class="border border-zinc-200 rounded-lg overflow-hidden">
								<!-- Chapter header -->
								<div class="bg-zinc-50 p-4 border-b border-zinc-200">
									<h3 class="font-semibold text-zinc-900">
										Chapter {chapter.index}: {chapter.title}
									</h3>
									{#if chapter.description}
										<p class="text-sm text-zinc-600 mt-1">{chapter.description}</p>
									{/if}
								</div>
								
								<!-- Paragraphs list -->
								<div class="p-4 space-y-2">
									{#each chapter.paragraphs as paragraph}
										<div class="flex items-center space-x-3 text-sm">
											<div class="w-2 h-2 rounded-full {paragraph.isGenerated ? 'bg-green-500' : 'bg-zinc-300'}"></div>
											<span class="text-zinc-700">
												{paragraph.index}. {paragraph.summary || 'Untitled section'}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
					{/snippet}
				</Drawer>
		{/if}
</div>

<style>
	/* Add any necessary styles */
</style>
