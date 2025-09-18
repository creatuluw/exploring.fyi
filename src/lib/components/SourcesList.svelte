<script lang="ts">
	import { ExternalLink, Book, Video, FileText, Code, GraduationCap, Search } from 'lucide-svelte';
	import type { SourceSuggestion } from '$lib/types/index.js';

	interface Props {
		sources: SourceSuggestion[];
		title?: string;
	}

	let { sources, title = 'Sources & References' }: Props = $props();

	const getSourceIcon = (type: string) => {
		switch (type) {
			case 'video': return Video;
			case 'book': return Book;
			case 'course': return GraduationCap;
			case 'documentation': return Code;
			case 'research': return Search;
			case 'article':
			default: return FileText;
		}
	};

	const getCredibilityColor = (credibility: string) => {
		switch (credibility) {
			case 'high': return 'text-green-600 bg-green-100';
			case 'medium': return 'text-yellow-600 bg-yellow-100';
			case 'low': return 'text-red-600 bg-red-100';
			default: return 'text-gray-600 bg-gray-100';
		}
	};

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case 'beginner': return 'text-green-700 bg-green-50 border-green-200';
			case 'intermediate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
			case 'advanced': return 'text-red-700 bg-red-50 border-red-200';
			default: return 'text-gray-700 bg-gray-50 border-gray-200';
		}
	};

	const groupedSources = $derived(() => {
		const groups: Record<string, SourceSuggestion[]> = {};
		sources.forEach(source => {
			if (!groups[source.type]) {
				groups[source.type] = [];
			}
			groups[source.type].push(source);
		});
		return groups;
	});
</script>

<div class="bg-white rounded-lg border border-zinc-200 p-8">
	<h2 class="text-xl font-semibold text-zinc-900 mb-6 flex items-center">
		<Book class="h-5 w-5 mr-2" />
		{title}
	</h2>

	{#if sources.length === 0}
		<div class="text-center py-8">
			<div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<Book class="h-8 w-8 text-zinc-400" />
			</div>
			<p class="text-zinc-500">No sources available yet</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each Object.entries(groupedSources) as [type, typeSources]}
				<div>
					<h3 class="text-lg font-medium text-zinc-800 mb-3 flex items-center capitalize">
						{#snippet typeIcon()}
							{@const Icon = getSourceIcon(type)}
							<Icon class="h-4 w-4 mr-2" />
						{/snippet}
						{@render typeIcon()}
						{type}s
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each typeSources as source}
							<a 
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block bg-zinc-50 rounded-lg p-4 border border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 transition-all duration-200 group"
							>
								<div class="flex items-start justify-between mb-2">
									<h4 class="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">
										{source.title}
									</h4>
									<ExternalLink class="h-4 w-4 text-zinc-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
								</div>
								
								<p class="text-sm text-zinc-600 mb-3 line-clamp-2">
									{source.description}
								</p>
								
								<div class="flex items-center justify-between">
									<div class="flex items-center space-x-2">
										<span class="px-2 py-1 rounded text-xs font-medium {getCredibilityColor(source.credibility)}">
											{source.credibility} credibility
										</span>
										<span class="px-2 py-1 rounded border text-xs font-medium {getDifficultyColor(source.difficulty)}">
											{source.difficulty}
										</span>
									</div>
									
									{#if source.estimatedTime}
										<span class="text-xs text-zinc-500">
											{source.estimatedTime}
										</span>
									{/if}
								</div>
								
								{#if source.author}
									<div class="mt-2 text-xs text-zinc-500">
										By {source.author}
									</div>
								{/if}
								
								<div class="mt-1 text-xs text-zinc-400">
									{source.domain}
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
