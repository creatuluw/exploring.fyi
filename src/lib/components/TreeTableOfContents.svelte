<script lang="ts">
	import { ChevronDown, ChevronRight, BookOpen, FileText, Clock, Star, Loader2, CheckCircle2 } from 'lucide-svelte';
	import type { ContentSection as ContentSectionType } from '$lib/services/streamingContentGeneration.js';

	interface Props {
		sections: ContentSectionType[];
		loadedParagraphs: Map<string, any>;
		contentMetadata?: any;
		isGenerating: boolean;
		isLoadingFromCache: boolean;
		totalParagraphs: number;
		loadedParagraphCount: number;
		currentSection?: number;
		onSectionClick: (index: number) => void;
		onParagraphClick: (paragraphId: string) => void;
		getDifficultyColor: (difficulty: string) => string;
	}

	let {
		sections,
		loadedParagraphs,
		contentMetadata,
		isGenerating,
		isLoadingFromCache,
		totalParagraphs,
		loadedParagraphCount,
		currentSection = 0,
		onSectionClick,
		onParagraphClick,
		getDifficultyColor
	}: Props = $props();

	// Track expanded sections
	let expandedSections = $state<Set<number>>(new Set([0])); // First section expanded by default

	const toggleSection = (sectionIndex: number) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(sectionIndex)) {
			newExpanded.delete(sectionIndex);
		} else {
			newExpanded.add(sectionIndex);
		}
		expandedSections = newExpanded;
	};

	const handleSectionClick = (sectionIndex: number) => {
		onSectionClick(sectionIndex);
	};

	// Progress calculation helper
	const getSectionProgress = (section: ContentSectionType) => {
		if (section.paragraphs.length === 0) return 0;
		const loadedCount = section.paragraphs.filter(p => loadedParagraphs.has(p.id)).length;
		return Math.round((loadedCount / section.paragraphs.length) * 100);
	};

	// Check if section has any loaded paragraphs
	const hasLoadedParagraphs = (section: ContentSectionType) => {
		return section.paragraphs.some(p => loadedParagraphs.has(p.id));
	};
</script>

<div class="h-full">
	<!-- Metadata -->
	<div class="mb-4">
		
		<!-- Quick metadata -->
		{#if contentMetadata}
			<div class="space-y-2 text-xs">
				<div class="flex items-center text-gray-500 dark:text-gray-400">
					<Clock class="h-3 w-3 mr-2 flex-shrink-0" />
					<span class="truncate">{contentMetadata.estimatedReadTime}</span>
				</div>
				<div class="flex items-center">
					<Star class="h-3 w-3 mr-2 flex-shrink-0" />
					<span class="px-2 py-1 rounded text-xs font-medium capitalize {getDifficultyColor(contentMetadata.difficulty)}">
						{contentMetadata.difficulty}
					</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Tree Structure -->
	<nav class="space-y-1" aria-label="Table of contents">
		{#each sections as section, sectionIndex}
			{@const sectionProgress = getSectionProgress(section)}
			{@const isExpanded = expandedSections.has(sectionIndex)}
			{@const isCurrentSection = currentSection === sectionIndex}
			{@const sectionHasContent = hasLoadedParagraphs(section)}
			{@const loadedParagraphsCount = section.paragraphs.filter(p => loadedParagraphs.has(p.id)).length}
			
			<!-- Section Item -->
			<div class="relative">
				<div class="flex items-center justify-between mb-0.5 last:mb-0 {isCurrentSection ? 'bg-gradient-to-r from-violet-500/10 to-violet-500/5 rounded-lg' : ''}" data-current={isCurrentSection}>
					<!-- Section Link with Expand Toggle -->
					<button
						onclick={() => {
							toggleSection(sectionIndex);
							handleSectionClick(sectionIndex);
						}}
						class="block w-full text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white truncate transition"
					>
						<div class="flex items-center justify-between px-4 py-2">
							<div class="flex items-center min-w-0 flex-1">
								<!-- Section icon based on type -->
								<div class="shrink-0 mr-3">
									{#if section.type === 'introduction'}
										<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
									{:else if section.type === 'explanation'}
										<div class="w-2 h-2 bg-purple-500 rounded-full"></div>
									{:else if section.type === 'example'}
										<div class="w-2 h-2 bg-green-500 rounded-full"></div>
									{:else if section.type === 'application'}
										<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
									{:else}
										<div class="w-2 h-2 bg-gray-500 rounded-full"></div>
									{/if}
								</div>
								<span class="text-sm font-medium truncate pr-2 {isCurrentSection ? 'text-violet-600 dark:text-violet-400' : ''}">{section.title}</span>
							</div>
							<div class="flex items-center space-x-2 flex-shrink-0">
								<!-- Status indicators -->
								{#if section.paragraphs.length > 0}
									{#if sectionProgress === 100}
										<CheckCircle2 class="h-3 w-3 text-green-500" />
									{:else if sectionProgress > 0}
										<div class="flex items-center space-x-1">
											<span class="text-xs text-gray-500 dark:text-gray-400">{loadedParagraphsCount}/{section.paragraphs.length}</span>
											<Loader2 class="h-3 w-3 text-blue-500 animate-spin" />
										</div>
									{:else if isGenerating}
										<Loader2 class="h-3 w-3 text-gray-400 animate-spin" />
									{:else}
										<span class="text-xs text-gray-400">{section.paragraphs.length}</span>
									{/if}
								{:else if isGenerating}
									<Loader2 class="h-3 w-3 text-gray-400 animate-spin" />
								{/if}
								
								<!-- Expand/Collapse Icon -->
								{#if section.paragraphs.length > 0 && sectionHasContent}
									<div class="flex shrink-0 ml-2">
										{#if isExpanded}
											<ChevronDown class="w-3 h-3 shrink-0 fill-current text-gray-400 dark:text-gray-500 rotate-0" />
										{:else}
											<ChevronRight class="w-3 h-3 shrink-0 fill-current text-gray-400 dark:text-gray-500 rotate-0" />
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</button>
				</div>

				<!-- Paragraphs List -->
				{#if isExpanded && sectionHasContent}
					<div class="mt-1">
						<ul class="pl-8 space-y-1">
							{#each section.paragraphs as paragraph}
								{@const isLoaded = loadedParagraphs.has(paragraph.id)}
								{#if isLoaded}
									<li class="mb-1 last:mb-0">
										<button
											onclick={() => onParagraphClick(paragraph.id)}
											class="block text-gray-500/90 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition truncate w-full text-left"
										>
											<span class="text-xs font-medium flex items-center">
												<FileText class="h-3 w-3 mr-2 flex-shrink-0" />
												<span class="truncate">{paragraph.title}</span>
												<div class="w-1.5 h-1.5 bg-green-500 rounded-full ml-2 flex-shrink-0"></div>
											</span>
										</button>
									</li>
								{/if}
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/each}
	</nav>

	<!-- Overall Progress Footer -->
	{#if isGenerating && totalParagraphs > 0}
		<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/60">
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
				<span class="flex items-center">
					{#if isLoadingFromCache}
						<div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
						From cache
					{:else}
						<Loader2 class="h-3 w-3 animate-spin mr-2" />
						Generating...
					{/if}
				</span>
				<span class="font-medium">{loadedParagraphCount}/{totalParagraphs}</span>
			</div>
			
			<!-- Progress Bar -->
			<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
				<div 
					class="h-1.5 rounded-full transition-all duration-300 {isLoadingFromCache ? 'bg-green-500' : 'bg-violet-500'}"
					style="width: {totalParagraphs > 0 ? (loadedParagraphCount / totalParagraphs) * 100 : 0}%"
				></div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for long content - match Mosaic style */
	nav {
		max-height: 60vh;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: #d1d5db transparent;
	}

	nav::-webkit-scrollbar {
		width: 6px;
	}

	nav::-webkit-scrollbar-track {
		background: transparent;
	}

	nav::-webkit-scrollbar-thumb {
		background: #d1d5db;
		border-radius: 3px;
	}

	nav::-webkit-scrollbar-thumb:hover {
		background: #9ca3af;
	}

	/* Dark mode scrollbar */
	:global(.dark) nav {
		scrollbar-color: #6b7280 transparent;
	}

	:global(.dark) nav::-webkit-scrollbar-thumb {
		background: #6b7280;
	}

	:global(.dark) nav::-webkit-scrollbar-thumb:hover {
		background: #9ca3af;
	}

	/* Smooth transitions like Mosaic */
	button {
		transition: all 0.15s ease-in-out;
	}

	/* Focus styles consistent with Mosaic */
	button:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
	}

	/* Tree expansion animation */
	.space-y-1 > div {
		transition: all 0.2s ease-in-out;
	}

	/* Progress bar animation */
	div[style*="width:"] {
		transition: width 0.3s ease-in-out;
	}

	/* Text truncation for long titles */
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Improved hover states */
	button:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	:global(.dark) button:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	/* Section type indicators */
	.w-2.h-2 {
		transition: all 0.2s ease-in-out;
	}
</style>
