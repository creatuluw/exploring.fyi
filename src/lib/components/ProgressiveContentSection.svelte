<script lang="ts">
	import { Check, ChevronRight, Loader2, MessageCircle, PlayCircle, Clock, CheckCircle, Trophy, Sparkles } from 'lucide-svelte';
	import type { ChapterWithParagraphs, ParagraphRecord } from '$lib/types/index.js';
	import { session } from '$lib/stores/session.js';
	import { get } from 'svelte/store';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import ParagraphChatDrawer from './ParagraphChatDrawer.svelte';
	import { ChapterProgressTracker, type ChapterCompletionEvent } from '$lib/services/chapterProgressTracking.js';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		chapter: ChapterWithParagraphs;
		topicId: string;
		topicTitle: string;
		onGenerateParagraph?: (paragraphId: string, chapterTitle: string, paragraphIndex: number, paragraphSummary?: string) => Promise<void>;
	}

	let { 
		chapter, 
		topicId, 
		topicTitle,
		onGenerateParagraph
	}: Props = $props();

	// State for paragraph generation and display
	let generatingParagraphs = $state<Set<string>>(new Set());
	let generatedParagraphs = $state<Map<string, ParagraphRecord>>(new Map());
	let readParagraphs = $state<Set<string>>(new Set());
	
	// Chapter completion state
	let isChapterComplete = $state(false);
	let chapterCompletedAt = $state<string | null>(null);
	let showCompletionCelebration = $state(false);
	
	// Chat drawer state
	let isChatDrawerOpen = $state(false);
	let selectedParagraphId = $state('');
	let selectedParagraphContent = $state('');

	// Progress tracking
	const totalParagraphs = $derived(chapter.paragraphs.length);
	const generatedCount = $derived(generatedParagraphs.size);
	const readCount = $derived(readParagraphs.size);
	const progressPercentage = $derived(totalParagraphs > 0 ? Math.round((readCount / totalParagraphs) * 100) : 0);

	// Initialize with any pre-generated paragraphs and load progress state
	onMount(async () => {
		// Load existing progress state
		const existingProgress = await ChapterProgressTracker.loadProgressState(topicId, chapter.id);
		readParagraphs = existingProgress;
		
		// Check if chapter is already complete
		const chapterProgress = await ChapterProgressTracker.getChapterProgress(topicId, chapter.id);
		if (chapterProgress) {
			isChapterComplete = chapterProgress.isComplete;
			chapterCompletedAt = chapterProgress.completedAt;
		}
		
		// Register for chapter completion events
		ChapterProgressTracker.onChapterComplete(chapter.id, handleChapterCompletion);
		
		// Initialize generated paragraphs
		chapter.paragraphs.forEach(paragraph => {
			if (paragraph.isGenerated && paragraph.content) {
				generatedParagraphs.set(paragraph.id, paragraph);
			}
		});
		generatedParagraphs = new Map(generatedParagraphs); // Trigger reactivity
	});

	// Cleanup on component destroy
	onDestroy(() => {
		ChapterProgressTracker.endAllActiveSessions();
		ChapterProgressTracker.offChapterComplete(chapter.id);
	});

	/**
	 * Handle chapter completion event
	 */
	function handleChapterCompletion(event: ChapterCompletionEvent) {
		console.log(`🎉 [Progressive Section] Chapter completed: ${chapter.title}`);
		
		isChapterComplete = true;
		chapterCompletedAt = event.completedAt;
		showCompletionCelebration = true;
		
		// Hide celebration after 5 seconds
		setTimeout(() => {
			showCompletionCelebration = false;
		}, 5000);
	}

	/**
	 * Generate next paragraph content
	 */
	async function generateNextParagraph(paragraphId: string) {
		if (generatingParagraphs.has(paragraphId)) return;
		
		const paragraph = chapter.paragraphs.find(p => p.id === paragraphId);
		if (!paragraph) return;

		generatingParagraphs.add(paragraphId);
		generatingParagraphs = new Set(generatingParagraphs); // Trigger reactivity

		try {
			// Call the parent handler to generate content
			await onGenerateParagraph?.(
				paragraphId, 
				chapter.title, 
				paragraph.index,
				paragraph.summary
			);

			// The paragraph content will be updated via the parent component
			// We need to refresh our local state when that happens
		} catch (error) {
			console.error('❌ [Progressive Section] Failed to generate paragraph:', error);
		} finally {
			generatingParagraphs.delete(paragraphId);
			generatingParagraphs = new Set(generatingParagraphs); // Trigger reactivity
		}
	}

	/**
	 * Mark paragraph as read with enhanced tracking
	 */
	async function markParagraphAsRead(paragraphId: string) {
		const sessionState = get(session);
		if (!sessionState?.id) return;

		const paragraphData = generatedParagraphs.get(paragraphId);
		if (!paragraphData?.content) {
			console.warn('⚠️ [Progressive Section] Cannot mark ungenerated paragraph as read');
			return;
		}

		try {
			const success = await ChapterProgressTracker.markParagraphAsRead(
				topicId,
				chapter.id,
				paragraphId,
				paragraphData.content
			);

			if (success) {
				// Update local state
				readParagraphs.add(paragraphId);
				readParagraphs = new Set(readParagraphs); // Trigger reactivity
				console.log(`✅ [Progressive Section] Marked paragraph ${paragraphId} as read`);
			} else {
				console.error('❌ [Progressive Section] Failed to mark paragraph as read');
			}
		} catch (error) {
			console.error('❌ [Progressive Section] Error marking paragraph as read:', error);
		}
	}

	/**
	 * Toggle paragraph read status
	 */
	async function toggleParagraphReadStatus(paragraphId: string) {
		const sessionState = get(session);
		if (!sessionState?.id) return;

		const paragraphData = generatedParagraphs.get(paragraphId);
		if (!paragraphData?.content) return;

		const isCurrentlyRead = readParagraphs.has(paragraphId);

		try {
			let success: boolean;
			
			if (isCurrentlyRead) {
				success = await ChapterProgressTracker.markParagraphAsUnread(
					topicId,
					chapter.id,
					paragraphId,
					paragraphData.content
				);
			} else {
				success = await ChapterProgressTracker.markParagraphAsRead(
					topicId,
					chapter.id,
					paragraphId,
					paragraphData.content
				);
			}

			if (success) {
				// Update local state
				if (isCurrentlyRead) {
					readParagraphs.delete(paragraphId);
				} else {
					readParagraphs.add(paragraphId);
				}
				readParagraphs = new Set(readParagraphs); // Trigger reactivity
			}
		} catch (error) {
			console.error('❌ [Progressive Section] Error toggling read status:', error);
		}
	}

	/**
	 * Start reading session for paragraph (when it becomes visible)
	 */
	function startParagraphReading(paragraphId: string) {
		ChapterProgressTracker.startParagraphReading(paragraphId);
	}

	/**
	 * End reading session for paragraph  
	 */
	function endParagraphReading(paragraphId: string) {
		ChapterProgressTracker.endParagraphReading(paragraphId);
	}

	/**
	 * Open chat for paragraph
	 */
	function openParagraphChat(paragraphId: string, content: string) {
		selectedParagraphId = paragraphId;
		selectedParagraphContent = content;
		isChatDrawerOpen = true;
	}

	/**
	 * Get next ungeneratred paragraph
	 */
	function getNextUngeneratedParagraph(): ParagraphRecord | null {
		return chapter.paragraphs.find(p => !generatedParagraphs.has(p.id)) || null;
	}

	/**
	 * Check if paragraph should be visible (progressive reveal)
	 */
	function isParagraphVisible(paragraphIndex: number): boolean {
		// Show first paragraph always
		if (paragraphIndex === 1) return true;
		
		// Show if previous paragraph is generated
		const previousParagraph = chapter.paragraphs.find(p => p.index === paragraphIndex - 1);
		return previousParagraph ? generatedParagraphs.has(previousParagraph.id) : false;
	}

	/**
	 * Update generated paragraphs from external source
	 */
	export function updateGeneratedParagraph(paragraphId: string, paragraphData: ParagraphRecord) {
		generatedParagraphs.set(paragraphId, paragraphData);
		generatedParagraphs = new Map(generatedParagraphs); // Trigger reactivity
	}

	/**
	 * Svelte action to track reading time using Intersection Observer
	 */
	function trackReadingTime(node: HTMLElement, paragraphId: string) {
		let observer: IntersectionObserver;
		
		if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							// Paragraph came into view - start tracking
							startParagraphReading(paragraphId);
						} else {
							// Paragraph left view - end tracking
							endParagraphReading(paragraphId);
						}
					});
				},
				{
					threshold: 0.5, // Trigger when 50% of paragraph is visible
					rootMargin: '0px 0px -10% 0px' // Account for bottom margin
				}
			);
			
			observer.observe(node);
		}
		
		return {
			destroy() {
				if (observer) {
					observer.disconnect();
				}
				// Ensure we end tracking when component is destroyed
				endParagraphReading(paragraphId);
			}
		};
	}
</script>

<div class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
	<!-- Chapter header -->
	<div class="p-8 border-b border-zinc-200 bg-gradient-to-r from-blue-50 to-white">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold text-zinc-900 mb-2">
					{chapter.title}
				</h2>
				{#if chapter.description}
					<p class="text-zinc-600 mb-4 max-w-2xl">
						{chapter.description}
					</p>
				{/if}
				<div class="flex items-center space-x-4 text-sm text-zinc-600">
					<span class="capitalize px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-medium shadow-sm">
						Chapter {chapter.index}
					</span>
					{#if isChapterComplete}
						<span class="flex items-center px-3 py-1 bg-green-100 border border-green-200 rounded-full text-xs font-medium text-green-700">
							<CheckCircle class="w-3 h-3 mr-1" />
							Completed
						</span>
					{:else}
						<span class="flex items-center">
							<span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
							{generatedCount}/{totalParagraphs} paragraphs generated
						</span>
						<span class="flex items-center">
							<span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
							{readCount}/{totalParagraphs} paragraphs read
						</span>
					{/if}
				</div>
			</div>
			
			<!-- Progress indicator -->
			<div class="text-right">
				<div class="text-sm text-zinc-600 mb-2 flex items-center">
					<Clock class="w-4 h-4 mr-1" />
					Reading Progress
				</div>
				<div class="w-32 bg-zinc-200 rounded-full h-2 mb-1">
					<div 
						class="h-2 rounded-full transition-all duration-300 bg-green-500"
						style="width: {progressPercentage}%"
					></div>
				</div>
				<div class="text-xs text-zinc-500">{progressPercentage}%</div>
				{#if readCount > 0}
					<div class="text-xs text-green-600 mt-1">
						{readCount} of {totalParagraphs} completed
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Chapter completion celebration -->
	{#if showCompletionCelebration}
		<div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 animate-bounce">
			<div class="flex items-center justify-center space-x-3">
				<Trophy class="w-6 h-6" />
				<div class="text-center">
					<div class="font-bold text-lg">Chapter Completed! 🎉</div>
					<div class="text-sm opacity-90">You've read all {totalParagraphs} paragraphs in "{chapter.title}"</div>
				</div>
				<Sparkles class="w-6 h-6" />
			</div>
		</div>
	{/if}

	<!-- Paragraph content -->
	<div class="p-6">
		{#each chapter.paragraphs as paragraph, index}
			{#if isParagraphVisible(paragraph.index)}
				{@const isGenerated = generatedParagraphs.has(paragraph.id)}
				{@const isGenerating = generatingParagraphs.has(paragraph.id)}
				{@const isRead = readParagraphs.has(paragraph.id)}
				{@const paragraphData = generatedParagraphs.get(paragraph.id)}
				
				<div class="mb-6 last:mb-0">
					<!-- Paragraph stub/placeholder when not generated -->
					{#if !isGenerated && !isGenerating}
						<div class="border border-dashed border-zinc-300 rounded-lg p-6 bg-zinc-50/50">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="font-medium text-zinc-900 mb-1">
										Paragraph {paragraph.index}: {paragraph.summary || 'Untitled'}
									</h3>
									<p class="text-sm text-zinc-600">
										Click "Explain" to generate this content
									</p>
								</div>
								<button
									onclick={() => generateNextParagraph(paragraph.id)}
									class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
								>
									<PlayCircle class="w-4 h-4 mr-2" />
									Explain
								</button>
							</div>
						</div>
					{/if}

					<!-- Generating state -->
					{#if isGenerating}
						<div class="border border-blue-200 rounded-lg p-6 bg-blue-50/50">
							<div class="flex items-center justify-center space-x-3 text-blue-700">
								<Loader2 class="h-5 w-5 animate-spin" />
								<span class="font-medium">Generating paragraph {paragraph.index}...</span>
							</div>
						</div>
					{/if}

						<!-- Generated paragraph content -->
						{#if isGenerated && paragraphData}
			<div 
				id="paragraph-{paragraph.id}"
				class="border border-zinc-200 rounded-lg overflow-hidden {isRead ? 'bg-green-50/30 border-green-200' : 'bg-white'}"
				data-paragraph-id={paragraph.id}
				use:trackReadingTime={paragraph.id}
			>
							<!-- Paragraph header -->
							<div class="bg-gradient-to-r from-zinc-50 to-zinc-100 px-6 py-4 border-b border-zinc-200">
								<div class="flex items-center justify-between">
									<h3 class="font-semibold text-zinc-900">
										Paragraph {paragraph.index}: {paragraph.summary || 'Content'}
									</h3>
									<div class="flex items-center space-x-2">
										<!-- Chat button -->
										<button
											onclick={() => openParagraphChat(paragraph.id, paragraphData.content || '')}
											class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 hover:scale-105"
											title="Ask AI about this paragraph"
										>
											<MessageCircle class="w-4 h-4" />
										</button>
										
									<!-- Read status button -->
									<button
										onclick={() => toggleParagraphReadStatus(paragraph.id)}
										class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 {
											isRead 
												? 'bg-green-500 text-white shadow-md' 
												: 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'
										} cursor-pointer hover:scale-105"
										title={isRead ? 'Mark as unread' : 'Mark as read'}
									>
										<Check class="w-4 h-4" />
									</button>
									</div>
								</div>
							</div>

							<!-- Paragraph content -->
							<div class="p-6 {isRead ? 'opacity-75' : ''}">
								<MarkdownRenderer 
									content={paragraphData.content || ''}
									class="max-w-none"
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{/each}

		<!-- Chapter completion summary -->
		{#if isChapterComplete}
			<div class="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
				<div class="flex items-center space-x-3 mb-4">
					<div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
						<Trophy class="w-6 h-6 text-white" />
					</div>
					<div>
						<h3 class="font-semibold text-green-900">Chapter Complete!</h3>
						<p class="text-sm text-green-700">
							You've successfully read all {totalParagraphs} paragraphs in this chapter.
						</p>
						{#if chapterCompletedAt}
							<p class="text-xs text-green-600 mt-1">
								Completed {new Date(chapterCompletedAt).toLocaleDateString('en-US', { 
									month: 'long', 
									day: 'numeric', 
									hour: 'numeric', 
									minute: '2-digit'
								})}
							</p>
						{/if}
					</div>
				</div>
				
				<!-- TODO: Add chapter check button here when implemented -->
				<div class="text-center">
					<p class="text-sm text-green-700 mb-3">Ready to test your knowledge?</p>
					<button
						disabled
						class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg opacity-50 cursor-not-allowed"
						title="Chapter assessment coming soon"
					>
						<CheckCircle class="w-4 h-4 mr-2" />
						Take Chapter Check (Coming Soon)
					</button>
				</div>
			</div>
		{:else}
			<!-- Next paragraph button (if more paragraphs available) -->
			{#if generatedCount > 0}
				{@const nextParagraph = getNextUngeneratedParagraph()}
				{#if nextParagraph}
				<div class="mt-6 text-center">
					<button
						onclick={() => generateNextParagraph(nextParagraph.id)}
						disabled={generatingParagraphs.has(nextParagraph.id)}
						class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{#if generatingParagraphs.has(nextParagraph.id)}
							<Loader2 class="w-4 h-4 mr-2 animate-spin" />
							Generating...
						{:else}
							<ChevronRight class="w-4 h-4 mr-2" />
							Continue to next paragraph
						{/if}
					</button>
				</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<!-- Chat Drawer -->
<ParagraphChatDrawer
	isOpen={isChatDrawerOpen}
	paragraphContent={selectedParagraphContent}
	paragraphId={selectedParagraphId}
	sectionId={chapter.id}
	sectionTitle={chapter.title}
	topicId={topicId}
	topicTitle={topicTitle}
	onClose={() => { isChatDrawerOpen = false; }}
/>
