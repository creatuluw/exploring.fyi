<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Brain, Clock, Star, BookOpen, Target, Lightbulb, Loader2, Menu, X, RefreshCw } from 'lucide-svelte';
	import { TocGenerationService } from '$lib/services/tocGeneration.js';
	import type { ChapterWithParagraphs, ParagraphRecord } from '$lib/types/index.js';
	import { session } from '$lib/stores/session.js';
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
	}

	let { data }: { data: PageData } = $props();
	
	// ToC generation state
	let tocGenerating = $state(false);
	let tocComplete = $state(false);
	let chapters = $state<ChapterWithParagraphs[]>([]);
	let error = $state('');
	
	// Drawer state
	let drawerOpen = $state(false);
	
	// Computed values
	const topicId = $derived(data.topicId);
	const topicTitle = $derived(data.topic);
	const totalChapters = $derived(chapters.length);
	const totalParagraphs = $derived(chapters.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0));

	// Component refs for updating paragraph content
	let progressiveSectionRefs = $state<Record<string, any>>({});

	onMount(async () => {
		await initializeToC();
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

			// Check for existing ToC first
			const existingToc = await TocGenerationService.getExistingToc(topicId);
			if (existingToc && existingToc.length > 0) {
				console.log(`ℹ️ [Progressive Topic] Found existing ToC with ${existingToc.length} chapters`);
				chapters = existingToc;
				tocComplete = true;
				tocGenerating = false;
				return;
			}

			// Generate new ToC
			console.log(`🤖 [Progressive Topic] Generating new ToC...`);
			const generatedChapters = await TocGenerationService.generateAndPersistToc(
				topicId,
				topicTitle,
				{
					difficulty: data.difficulty || 'intermediate',
					maxChapters: 6,
					context: data.context,
					nodeDescription: data.enhancedContext?.nodeInfo?.description
				}
			);

			chapters = generatedChapters;
			tocComplete = true;
			console.log(`✅ [Progressive Topic] ToC generated successfully with ${generatedChapters.length} chapters`);

		} catch (err) {
			console.error('❌ [Progressive Topic] ToC generation failed:', err);
			error = err instanceof Error ? err.message : 'Failed to generate table of contents';
		} finally {
			tocGenerating = false;
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

			const regeneratedChapters = await TocGenerationService.regenerateToc(
				topicId,
				topicTitle,
				{
					difficulty: data.difficulty || 'intermediate',
					maxChapters: 6,
					context: data.context,
					nodeDescription: data.enhancedContext?.nodeInfo?.description
				}
			);

			chapters = regeneratedChapters;
			tocComplete = true;
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
					chapters[chapterIndex].paragraphs[paragraphIndex] = {
						...chapters[chapterIndex].paragraphs[paragraphIndex],
						content: result.data.content,
						summary: result.data.summary,
						metadata: result.data.metadata,
						isGenerated: true,
						generatedAt: result.data.generatedAt || new Date().toISOString()
					};
					
					// Trigger reactivity
					chapters = [...chapters];

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
	 * Navigate back to mind map
	 */
	function goBack() {
		if (data.enhancedContext?.nodeInfo?.parentId) {
			goto(`/mind-map/${data.enhancedContext.nodeInfo.parentId}`);
		} else {
			goto('/');
		}
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
				<div class="bg-white rounded-lg border border-zinc-200 p-8">
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
								<strong>How it works:</strong> Content is generated progressively as you click "Explain next" for each section. 
								This ensures focused learning and prevents information overload.
							</div>
						</div>
					</div>
				</div>

				<!-- Progressive chapters -->
				{#each chapters as chapter}
					<ProgressiveContentSection
						bind:this={progressiveSectionRefs[chapter.id]}
						{chapter}
						{topicId}
						{topicTitle}
						onGenerateParagraph={handleParagraphGeneration}
					/>
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
