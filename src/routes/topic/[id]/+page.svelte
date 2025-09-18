<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Brain, Clock, Star, ExternalLink, BookOpen, Target, Lightbulb, Loader2 } from 'lucide-svelte';
	import { generateContentPage } from '$lib/services/contentGeneration.js';
	import type { DetailedContentPage } from '$lib/types/index.js';
	import ContentSection from '$lib/components/ContentSection.svelte';
	import SourcesList from '$lib/components/SourcesList.svelte';
	import RelatedConcepts from '$lib/components/RelatedConcepts.svelte';

	interface PageData {
		topicId: string;
		topic: string;
		context?: string;
		difficulty: 'beginner' | 'intermediate' | 'advanced';
	}

	let { data }: { data: PageData } = $props();
	
	let contentPage = $state<DetailedContentPage | null>(null);
	let isLoading = $state(true);
	let error = $state('');
	let currentSection = $state(0);

	onMount(async () => {
		await loadContent();
	});

	const loadContent = async () => {
		try {
			isLoading = true;
			error = '';
			
			console.log(`📝 [Topic Page] Loading content for: "${data.topic}"`);
			
			const content = await generateContentPage(
				data.topic, 
				data.context, 
				data.difficulty
			);
			
			contentPage = content;
			console.log(`✅ [Topic Page] Content loaded successfully`);
		} catch (err) {
			console.error('❌ [Topic Page] Error loading content:', err);
			error = err instanceof Error ? err.message : 'Failed to load content';
		} finally {
			isLoading = false;
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
					{#if contentPage}
						<div class="flex items-center space-x-2 px-2 py-1 rounded-md {getDifficultyColor(contentPage.difficulty)}">
							<span class="text-xs font-medium capitalize">{contentPage.difficulty}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main content area -->
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if isLoading}
			<!-- Loading state -->
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
		{:else if error}
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
							onclick={loadContent}
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
		{:else if contentPage}
			<!-- Content display -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
				<!-- Table of contents sidebar -->
				<div class="lg:col-span-1">
					<div class="bg-white rounded-lg border border-zinc-200 p-6 sticky top-32">
						<h3 class="font-semibold text-zinc-900 mb-4 flex items-center">
							<BookOpen class="h-4 w-4 mr-2" />
							Contents
						</h3>
						<nav class="space-y-2">
							{#each contentPage.sections as section, index}
								<button
									onclick={() => scrollToSection(index)}
									class="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors
										{currentSection === index 
											? 'bg-zinc-100 text-zinc-900 font-medium' 
											: 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}"
								>
									{section.title}
								</button>
							{/each}
						</nav>
						
						<!-- Quick info -->
						<div class="mt-6 pt-6 border-t border-zinc-200 space-y-3">
							<div class="flex items-center text-sm text-zinc-600">
								<Clock class="h-4 w-4 mr-2" />
								{contentPage.estimatedReadTime}
							</div>
							<div class="flex items-center text-sm">
								<Star class="h-4 w-4 mr-2" />
								<span class="px-2 py-1 rounded-md text-xs font-medium {getDifficultyColor(contentPage.difficulty)}">
									{contentPage.difficulty}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Main content -->
				<div class="lg:col-span-3 space-y-8">
					<!-- Header -->
					<div class="bg-white rounded-lg border border-zinc-200 p-8">
						<div class="space-y-4">
							<h1 class="text-3xl font-bold text-zinc-900">
								{contentPage.title}
							</h1>
							<p class="text-lg text-zinc-600 leading-relaxed">
								{contentPage.description}
							</p>
							
							<!-- Learning objectives -->
							{#if contentPage.learningObjectives.length > 0}
								<div class="bg-blue-50 rounded-lg p-6">
									<h3 class="font-semibold text-blue-900 mb-3 flex items-center">
										<Target class="h-4 w-4 mr-2" />
										What You'll Learn
									</h3>
									<ul class="space-y-2">
										{#each contentPage.learningObjectives as objective}
											<li class="flex items-start text-blue-800">
												<span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
												{objective}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Prerequisites -->
							{#if contentPage.prerequisites.length > 0}
								<div class="bg-yellow-50 rounded-lg p-6">
									<h3 class="font-semibold text-yellow-900 mb-3 flex items-center">
										<Lightbulb class="h-4 w-4 mr-2" />
										Prerequisites
									</h3>
									<ul class="space-y-2">
										{#each contentPage.prerequisites as prerequisite}
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

					<!-- Content sections -->
					{#each contentPage.sections as section, index}
						<div id="section-{index}">
							<ContentSection {section} />
						</div>
					{/each}

					<!-- Next steps -->
					{#if contentPage.nextSteps.length > 0}
						<div class="bg-white rounded-lg border border-zinc-200 p-8">
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

					<!-- Related concepts -->
					{#if contentPage.relatedTopics.length > 0}
						<RelatedConcepts concepts={contentPage.relatedTopics} />
					{/if}

					<!-- Sources (placeholder for now) -->
					{#if contentPage.sources && contentPage.sources.length > 0}
						<SourcesList sources={contentPage.sources} />
					{/if}
				</div>
			</div>
		{/if}
	</main>
</div>
