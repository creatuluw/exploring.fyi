<script lang="ts">
	import { Brain, ArrowRight, ChevronRight, Target, Link2, Zap, BookOpen } from 'lucide-svelte';
	import { createContentId } from '$lib/services/contentGeneration.js';
	import { goto } from '$app/navigation';
	import type { RelatedTopic } from '$lib/types/index.js';

	interface Props {
		concepts: RelatedTopic[];
		title?: string;
	}

	let { concepts, title = 'Related Concepts' }: Props = $props();

	const getConnectionIcon = (connectionType: string) => {
		switch (connectionType) {
			case 'prerequisite': return Target;
			case 'related': return Link2;
			case 'advanced': return Zap;
			case 'application': return BookOpen;
			default: return Brain;
		}
	};

	const getConnectionColor = (connectionType: string) => {
		switch (connectionType) {
			case 'prerequisite': return 'text-blue-600 bg-blue-100 border-blue-200';
			case 'related': return 'text-green-600 bg-green-100 border-green-200';
			case 'advanced': return 'text-red-600 bg-red-100 border-red-200';
			case 'application': return 'text-purple-600 bg-purple-100 border-purple-200';
			default: return 'text-gray-600 bg-gray-100 border-gray-200';
		}
	};

	const getRelevanceOpacity = (relevance: string) => {
		switch (relevance) {
			case 'high': return 'opacity-100';
			case 'medium': return 'opacity-80';
			case 'low': return 'opacity-60';
			default: return 'opacity-100';
		}
	};

	const handleConceptClick = (concept: RelatedTopic) => {
		const contentId = createContentId(concept.name);
		const params = new URLSearchParams({
			topic: concept.name,
			difficulty: 'intermediate'
		});
		goto(`/topic/${contentId}?${params.toString()}`);
	};

	// Group concepts by connection type
	const groupedConcepts = $derived(() => {
		const groups: Record<string, RelatedTopic[]> = {};
		concepts.forEach(concept => {
			if (!groups[concept.connectionType]) {
				groups[concept.connectionType] = [];
			}
			groups[concept.connectionType].push(concept);
		});
		return groups;
	});

	const connectionTypeLabels: Record<string, string> = {
		prerequisite: 'Prerequisites',
		related: 'Related Topics',
		advanced: 'Advanced Topics',
		application: 'Applications'
	};
</script>

<div class="bg-white rounded-lg border border-zinc-200 p-8">
	<h2 class="text-xl font-semibold text-zinc-900 mb-6 flex items-center">
		<Brain class="h-5 w-5 mr-2" />
		{title}
	</h2>

	{#if concepts.length === 0}
		<div class="text-center py-8">
			<div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<Brain class="h-8 w-8 text-zinc-400" />
			</div>
			<p class="text-zinc-500">No related concepts found</p>
		</div>
	{:else}
		<div class="space-y-8">
			{#each Object.entries(groupedConcepts) as [connectionType, typeConcepts]}
				<div>
					<h3 class="text-lg font-medium text-zinc-800 mb-4 flex items-center">
						{#if connectionType}
							{@const Icon = getConnectionIcon(connectionType)}
							<Icon class="h-4 w-4 mr-2" />
						{/if}
						{connectionTypeLabels[connectionType] || connectionType}
					</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each typeConcepts as concept}
							<button
								onclick={() => handleConceptClick(concept)}
								class="text-left bg-zinc-50 rounded-lg p-4 border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all duration-200 group {getRelevanceOpacity(concept.relevance)}"
							>
								<div class="flex items-start justify-between mb-2">
									<h4 class="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">
										{concept.name}
									</h4>
									<ChevronRight class="h-4 w-4 text-zinc-400 group-hover:text-blue-600 flex-shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
								</div>
								
								<p class="text-sm text-zinc-600 mb-3 line-clamp-2">
									{concept.description}
								</p>
								
								<div class="flex items-center justify-between">
									<span class="px-2 py-1 rounded border text-xs font-medium {getConnectionColor(concept.connectionType)}">
										{concept.connectionType}
									</span>
									
									<div class="flex items-center space-x-1">
										{#each Array(3) as _, i}
											<div 
												class="w-1.5 h-1.5 rounded-full {
													concept.relevance === 'high' && i < 3 ? 'bg-green-400' :
													concept.relevance === 'medium' && i < 2 ? 'bg-yellow-400' :
													concept.relevance === 'low' && i < 1 ? 'bg-red-400' :
													'bg-zinc-200'
												}"
											></div>
										{/each}
									</div>
								</div>
								
								<div class="mt-2 flex items-center text-xs text-zinc-500">
									<ArrowRight class="h-3 w-3 mr-1" />
									Click to explore
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Continue learning prompt -->
		<div class="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="font-semibold text-blue-900 mb-1">
						Ready to dive deeper?
					</h3>
					<p class="text-blue-700 text-sm">
						Explore these related concepts to expand your understanding and build comprehensive knowledge.
					</p>
				</div>
				<Brain class="h-8 w-8 text-blue-500 flex-shrink-0" />
			</div>
		</div>
	{/if}
</div>
