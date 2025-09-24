<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Brain, Clock, Star, ExternalLink, BookOpen, Target, Lightbulb, Loader2, Menu, X } from 'lucide-svelte';
	import { generateContentStreaming, getSectionLoadingState } from '$lib/services/streamingContentGeneration.js';
	import type { DetailedContentPage } from '$lib/types/index.js';
	import type { ContentMetadata, ContentSection as ContentSectionType } from '$lib/services/streamingContentGeneration.js';
	import ContentSection from '$lib/components/ContentSection.svelte';
	import SourcesList from '$lib/components/SourcesList.svelte';
	import RelatedConcepts from '$lib/components/RelatedConcepts.svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import TreeTableOfContents from '$lib/components/TreeTableOfContents.svelte';
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
	}

	let { data }: { data: PageData } = $props();
	
	// Streaming state
	let contentMetadata = $state<ContentMetadata | null>(null);
	let sections = $state<ContentSectionType[]>([]);
	let loadedParagraphs = $state<Map<string, any>>(new Map());
	let streamingParagraphs = $state<Map<string, string>>(new Map()); // For real-time content
	let contentPage = $state<DetailedContentPage | null>(null);
	let isGenerating = $state(true);
	let generationComplete = $state(false);
	let isLoadingFromCache = $state(false);
	let error = $state('');

	// Drawer state
	let drawerOpen = $state(true); // Start with drawer open
	let currentSection = $state(0);
	let totalSections = $state(0);
	let totalParagraphs = $state(0);
	let loadedParagraphCount = $state(0);

	onMount(async () => {
		await loadContentStreaming();
	});

	const loadContentStreaming = async () => {
		try {
			isGenerating = true;
			generationComplete = false;
			error = '';
			
			console.log(`📝 [Topic Page] Starting streaming content generation for: "${data.topic}"`);
			
			// Get or create a topic ID for caching
			let contentTopicId: string | undefined;
			try {
				const { TopicsService } = await import('$lib/database/topics.js');
				const { session } = await import('$lib/stores/session.js');
				const { get } = await import('svelte/store');
				
				const sessionState = get(session);
				if (sessionState.id) {
					// Create a topic record for content caching
					const topicResult = await TopicsService.getOrCreateTopic(
						sessionState.id,
						data.topic,
						'topic',
						data.context, // Use context as source_url if it's a URL
						undefined // No mind map data for content pages
					);
					contentTopicId = topicResult.topic.id;
					console.log(`📋 [Topic Page] Using topic ID for caching: ${contentTopicId}`);
				}
			} catch (topicError) {
				console.warn('⚠️ [Topic Page] Could not create topic for caching:', topicError);
				// Continue without caching if topic creation fails
			}
			
			await generateContentStreaming(
				data.topic,
				{
					onMetadata: (metadata, fromCache) => {
						contentMetadata = metadata;
						totalSections = metadata.sectionTitles.length;
						isLoadingFromCache = fromCache || false;
						console.log(`📋 [Topic Page] Received metadata with ${metadata.sectionTitles.length} sections${fromCache ? ' (from cache)' : ''}`);
					},
					onOutline: (outlineSections, fromCache) => {
						// Add new sections to existing sections (for sequential loading)
						if (Array.isArray(outlineSections)) {
							for (const newSection of outlineSections) {
								// Check if section already exists
								const existingIndex = sections.findIndex(s => s.id === newSection.id);
								if (existingIndex >= 0) {
									// Update existing section
									sections[existingIndex] = newSection;
								} else {
									// Add new section
									sections = [...sections, newSection];
								}
							}
						}
						
						// Update total paragraphs count
						totalParagraphs = sections.reduce((acc, s) => acc + s.paragraphs.length, 0);
						isLoadingFromCache = fromCache || false;
						console.log(`📋 [Topic Page] Received outline update: ${sections.length} total sections, ${totalParagraphs} total paragraphs${fromCache ? ' (from cache)' : ''}`);
					},
					onParagraph: (paragraph, fromCache) => {
						loadedParagraphs.set(paragraph.id, paragraph);
						loadedParagraphCount = loadedParagraphs.size;
						
						// Also add the paragraph to the appropriate section if it's not already there
						const sectionIndex = sections.findIndex(s => s.id === paragraph.sectionId);
						if (sectionIndex >= 0) {
							const existingParagraphIndex = sections[sectionIndex].paragraphs.findIndex(p => p.id === paragraph.id);
							if (existingParagraphIndex === -1) {
								// Add the paragraph to the section's paragraphs array
								sections[sectionIndex].paragraphs = [...sections[sectionIndex].paragraphs, paragraph];
								sections = [...sections]; // Trigger reactivity
							}
						}
						
						console.log(`📄 [Topic Page] Started paragraph ${loadedParagraphCount}/${totalParagraphs}: "${paragraph.title}"`);
					},
					onParagraphChunk: (paragraphId, content) => {
						// Update streaming content in real-time
						streamingParagraphs.set(paragraphId, content);
						streamingParagraphs = new Map(streamingParagraphs); // Trigger reactivity
						console.log(`📝 [Topic Page] Streaming content for paragraph: ${paragraphId} (${content.length} chars)`);
					},
					onParagraphComplete: (paragraph, fromCache) => {
						// Final paragraph content is complete
						loadedParagraphs.set(paragraph.id, paragraph);
						streamingParagraphs.delete(paragraph.id); // Remove from streaming map
						streamingParagraphs = new Map(streamingParagraphs); // Trigger reactivity
						console.log(`✅ [Topic Page] Completed paragraph: "${paragraph.title}"`);
					},
					onComplete: (fullContentPage, fromCache) => {
						contentPage = fullContentPage;
						isGenerating = false;
						generationComplete = true;
						isLoadingFromCache = fromCache || false;
						console.log(`🎉 [Topic Page] Content generation complete${fromCache ? ' (from cache)' : ''}`);
					},
					onError: (errorMessage) => {
						error = errorMessage;
						isGenerating = false;
						console.error(`❌ [Topic Page] Streaming error: ${errorMessage}`);
					}
				},
				data.enhancedContext || data.context, // Use enhanced context if available, fallback to legacy
				data.difficulty,
				contentTopicId // Pass topic ID for caching
			);
		} catch (err) {
			console.error('❌ [Topic Page] Error starting streaming:', err);
			error = err instanceof Error ? err.message : 'Failed to start content generation';
			isGenerating = false;
		}
	};

	const handleBackToExplore = () => {
		const params = new URLSearchParams();
		params.set('topic', data.topic);
		goto(`/explore?${params.toString()}`);
	};

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case 'beginner': return 'text-green-600 bg-green-100';
			case 'intermediate': return 'text-yellow-600 bg-yellow-100';
			case 'advanced': return 'text-red-600 bg-red-100';
			default: return 'text-gray-600 bg-gray-100';
		}
	};

	const scrollToSection = (index: number) => {
		currentSection = index;
		const element = document.getElementById(`section-${index}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	};

	const scrollToParagraph = (paragraphId: string) => {
		const element = document.getElementById(`paragraph-${paragraphId}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	};
</script>

<svelte:head>
	<title>{contentPage?.title || data.topic} - Explore.fyi</title>
	<meta name="description" content={contentPage?.description || `Learn about ${data.topic} with comprehensive AI-generated content`} />
</svelte:head>

<div class="min-h-screen bg-zinc-50">
	<!-- Header with navigation -->
	<div class="bg-white border-b border-zinc-200 sticky top-16 z-40">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-14">
				<button 
					onclick={handleBackToExplore}
					class="flex items-center space-x-2 text-zinc-600 hover:text-zinc-900 transition-colors duration-200"
				>
					<ArrowLeft class="h-4 w-4" />
					<span class="font-medium text-sm">Back to Mind Map</span>
				</button>
				
				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<Brain class="h-4 w-4 text-zinc-500" />
						<span class="text-sm font-medium text-zinc-900">{data.topic}</span>
					</div>
					{#if contentMetadata}
						<div class="flex items-center space-x-2 px-2 py-1 rounded-md {getDifficultyColor(contentMetadata.difficulty)}">
							<span class="text-xs font-medium capitalize">{contentMetadata.difficulty}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main content area -->
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if error}
			<!-- Error state -->
			<div class="flex flex-col items-center justify-center py-20">
				<div class="text-center space-y-6 max-w-md">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
						<ExternalLink class="h-8 w-8 text-red-600" />
					</div>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-zinc-900">
							Content Generation Failed
						</h2>
						<p class="text-zinc-600">
							{error}
						</p>
					</div>
					<div class="space-y-3">
						<button 
							onclick={loadContentStreaming}
							class="btn btn-primary"
						>
							Try Again
						</button>
						<button 
							onclick={handleBackToExplore}
							class="btn btn-secondary"
						>
							Back to Mind Map
						</button>
					</div>
				</div>
			</div>
		{:else if !contentMetadata && isGenerating}
			<!-- Initial loading state -->
			<div class="flex flex-col items-center justify-center py-20">
				<div class="text-center space-y-6">
					<div class="flex justify-center">
						<div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
							<Loader2 class="h-8 w-8 text-zinc-600 animate-spin" />
						</div>
					</div>
					<div class="space-y-2">
						<h2 class="text-xl font-semibold text-zinc-900">
							Generating Content
						</h2>
						<p class="text-zinc-600 max-w-md">
							AI is creating comprehensive learning content for "{data.topic}"...
						</p>
					</div>
				</div>
			</div>
		{:else if contentMetadata || sections.length > 0}
			<!-- Content display -->
			<div class="relative">
				<!-- Toggle button for drawer -->
				<div class="fixed top-20 left-4 z-30">
					<button
						onclick={() => drawerOpen = !drawerOpen}
						class="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow"
						aria-label={drawerOpen ? 'Close table of contents' : 'Open table of contents'}
					>
						{#if drawerOpen}
							<X class="h-5 w-5 text-gray-600 dark:text-gray-400" />
						{:else}
							<Menu class="h-5 w-5 text-gray-600 dark:text-gray-400" />
						{/if}
					</button>
				</div>

				<!-- Main content - full width -->
				<div class="space-y-8 relative">
					<!-- Header -->
					{#if contentMetadata}
						<div class="bg-white rounded-lg border border-zinc-200 p-8 ml-0 relative">
							<!-- TOC Toggle Button - Attached to container -->
							<button
								onclick={() => drawerOpen = true}
								class="absolute -left-[51px] top-3 p-3 bg-white dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 border-r-0 rounded-l-lg shadow-md hover:shadow-lg transition-all duration-200 group z-20"
								class:opacity-50={drawerOpen}
								class:cursor-default={drawerOpen}
								disabled={drawerOpen}
								title="Open Table of Contents"
							>
								<BookOpen class="h-5 w-5 text-violet-500" />
								{#if sections.length > 0}
									<span class="absolute -top-1 -right-1 px-1.5 py-0.5 bg-violet-500 text-white text-xs font-medium rounded-full min-w-[18px] text-center">
										{sections.length}
									</span>
								{/if}
							</button>
							<div class="space-y-4">
								<h1 class="text-3xl font-bold text-zinc-900">
									{contentMetadata.title}
								</h1>
								<p class="text-lg text-zinc-600 leading-relaxed">
									{contentMetadata.description}
								</p>
								
								<!-- Learning objectives -->
								{#if contentMetadata.learningObjectives.length > 0}
									<div class="bg-blue-50 rounded-lg p-6">
										<h3 class="font-semibold text-blue-900 mb-3 flex items-center">
											<Target class="h-4 w-4 mr-2" />
											What You'll Learn
										</h3>
										<ul class="space-y-2">
											{#each contentMetadata.learningObjectives as objective}
												<li class="flex items-start text-blue-800">
													<span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
													{objective}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Prerequisites -->
								{#if contentMetadata.prerequisites.length > 0}
									<div class="bg-yellow-50 rounded-lg p-6">
										<h3 class="font-semibold text-yellow-900 mb-3 flex items-center">
											<Lightbulb class="h-4 w-4 mr-2" />
											Prerequisites
										</h3>
										<ul class="space-y-2">
											{#each contentMetadata.prerequisites as prerequisite}
												<li class="flex items-start text-yellow-800">
													<span class="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
													{prerequisite}
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<!-- Loading state when we have sections but no metadata yet -->
						<div class="bg-white rounded-lg border border-zinc-200 p-8 ml-0 relative">
							<!-- TOC Toggle Button - Attached to container -->
							<button
								onclick={() => drawerOpen = true}
								class="absolute -left-[51px] top-3 p-3 bg-white dark:bg-gray-800 border border-zinc-200 dark:border-gray-700 border-r-0 rounded-l-lg shadow-md hover:shadow-lg transition-all duration-200 group z-20"
								class:opacity-50={drawerOpen}
								class:cursor-default={drawerOpen}
								disabled={drawerOpen}
								title="Open Table of Contents"
							>
								<BookOpen class="h-5 w-5 text-violet-500" />
								{#if sections.length > 0}
									<span class="absolute -top-1 -right-1 px-1.5 py-0.5 bg-violet-500 text-white text-xs font-medium rounded-full min-w-[18px] text-center">
										{sections.length}
									</span>
								{/if}
							</button>
							<div class="space-y-4">
								<div class="h-8 bg-zinc-200 rounded animate-pulse"></div>
								<div class="h-4 bg-zinc-200 rounded animate-pulse w-3/4"></div>
								<div class="h-4 bg-zinc-200 rounded animate-pulse w-1/2"></div>
							</div>
						</div>
					{/if}

					<!-- Content sections with paragraph cards -->
					{#each sections as section, sectionIndex}
						{@const sectionParagraphsLoaded = section.paragraphs.filter(p => loadedParagraphs.has(p.id)).length}
						{@const loadedParagraphsForSection = section.paragraphs.filter(p => loadedParagraphs.has(p.id))}
						<div id="section-{sectionIndex}" class="animate-fade-in">
							<div class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
								<!-- Section header -->
								<div class="p-8 border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white">
									<div class="flex items-center justify-between">
										<div>
											<h2 class="text-2xl font-bold text-zinc-900 mb-2">
												{section.title}
											</h2>
											<div class="flex items-center space-x-4 text-sm text-zinc-600">
												<span class="capitalize px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-medium shadow-sm">
													{section.type}
												</span>
												<span class="flex items-center">
													<span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
													{sectionParagraphsLoaded}/{section.paragraphs.length} paragraphs loaded
												</span>
											</div>
										</div>
										{#if sectionParagraphsLoaded < section.paragraphs.length && isGenerating}
											<div class="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
												<Loader2 class="h-4 w-4 animate-spin mr-2 text-blue-600" />
												<span class="text-blue-700 text-sm font-medium">Generating...</span>
											</div>
										{/if}
									</div>
								</div>
								
								<!-- Paragraph cards - only show loaded paragraphs -->
								{#if loadedParagraphsForSection.length > 0}
									<div class="p-6 space-y-4">
									{#each loadedParagraphsForSection as paragraph}
										{@const paragraphData = loadedParagraphs.get(paragraph.id)}
										{@const streamingContent = streamingParagraphs.get(paragraph.id)}
										{@const isStreamingParagraph = streamingParagraphs.has(paragraph.id)}
										{@const displayContent = streamingContent || (paragraphData?.content || '')}
										
										<div id="paragraph-{paragraph.id}" class="border border-zinc-200 rounded-xl overflow-hidden animate-fade-in shadow-sm hover:shadow-md transition-shadow duration-200">
											<div class="bg-gradient-to-r from-zinc-50 to-zinc-100 px-6 py-4 border-b border-zinc-200">
												<div class="flex items-center justify-between">
													<h3 class="font-semibold text-zinc-900 text-lg">
														{paragraph.title}
													</h3>
													<div class="flex items-center space-x-2">
														{#if isStreamingParagraph}
															<span class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full flex items-center">
																<Loader2 class="h-3 w-3 animate-spin mr-1" />
																Streaming...
															</span>
															<div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
														{:else if paragraphData}
															<span class="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Complete</span>
															<div class="w-2 h-2 bg-green-500 rounded-full"></div>
														{:else}
															<span class="text-xs text-zinc-500 bg-white px-2 py-1 rounded-full">Loading...</span>
															<div class="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
														{/if}
													</div>
												</div>
											</div>
											
											<div class="p-8 bg-white">
												{#if displayContent}
													<div class="relative">
														<MarkdownRenderer 
															content={displayContent}
															class="max-w-none"
														/>
														{#if isStreamingParagraph}
															<!-- Typing cursor effect -->
															<span class="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse"></span>
														{/if}
													</div>
												{:else}
													<!-- Placeholder for empty paragraphs -->
													<div class="flex items-center justify-center py-8 text-zinc-400">
														<Loader2 class="h-5 w-5 animate-spin mr-2" />
														<span class="text-sm">Generating content...</span>
													</div>
												{/if}
											</div>
										</div>
									{/each}
									</div>
								{:else if section.paragraphs.length === 0 && isGenerating}
									<!-- Section placeholder when no paragraphs are outlined yet -->
									<div class="p-6">
										<div class="flex items-center justify-center space-x-3 text-zinc-500">
											<Loader2 class="h-4 w-4 animate-spin" />
											<span class="text-sm">Generating section content...</span>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}

					<!-- Loading indicator when generating -->
					{#if isGenerating && loadedParagraphCount < totalParagraphs}
						<div class="bg-white rounded-lg border border-zinc-200 p-8">
							<div class="flex items-center justify-center space-x-3 text-zinc-600">
								<Loader2 class="h-5 w-5 animate-spin" />
								<span>Generating paragraphs... ({loadedParagraphCount}/{totalParagraphs})</span>
							</div>
						</div>
					{/if}

					<!-- Next steps and related topics (only show when complete) -->
					{#if generationComplete && contentPage}
						<!-- Next steps -->
						{#if contentPage.nextSteps.length > 0}
							<div class="bg-white rounded-lg border border-zinc-200 p-8 animate-fade-in">
								<h2 class="text-xl font-semibold text-zinc-900 mb-4 flex items-center">
									<ArrowLeft class="h-5 w-5 mr-2 rotate-180" />
									Next Steps
								</h2>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									{#each contentPage.nextSteps as step, index}
										<div class="bg-zinc-50 rounded-lg p-4">
											<div class="flex items-start">
												<span class="w-6 h-6 bg-zinc-200 text-zinc-700 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
													{index + 1}
												</span>
												<p class="text-zinc-700">{step}</p>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Related topics -->
						{#if contentPage.relatedTopics.length > 0}
							<div class="animate-fade-in">
								<RelatedConcepts concepts={contentPage.relatedTopics} />
							</div>
						{/if}
					{/if}

					<!-- Sources (placeholder for now) -->
					{#if contentPage && contentPage.sources && contentPage.sources.length > 0}
						<SourcesList sources={contentPage.sources} />
					{/if}
				</div>

				<!-- Table of Contents Drawer -->
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
						<TreeTableOfContents
							{sections}
							{loadedParagraphs}
							{contentMetadata}
							{isGenerating}
							{isLoadingFromCache}
							{totalParagraphs}
							{loadedParagraphCount}
							{currentSection}
							onSectionClick={scrollToSection}
							onParagraphClick={scrollToParagraph}
							{getDifficultyColor}
						/>
					{/snippet}
				</Drawer>
			</div>
		{/if}
	</main>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-out;
	}
</style>
