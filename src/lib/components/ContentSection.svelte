<script lang="ts">
	import { marked } from 'marked';
	import { BookOpen, Code, Image, Play } from 'lucide-svelte';
	import type { DetailedContentSection } from '$lib/types/index.js';

	interface Props {
		section: DetailedContentSection;
	}

	let { section }: Props = $props();

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	const getSectionIcon = (type: string) => {
		switch (type) {
			case 'introduction': return BookOpen;
			case 'explanation': return BookOpen;
			case 'example': return Code;
			case 'application': return Play;
			case 'summary': return BookOpen;
			default: return BookOpen;
		}
	};

	const getSectionBgColor = (type: string) => {
		switch (type) {
			case 'introduction': return 'bg-blue-50 border-blue-200';
			case 'explanation': return 'bg-white border-zinc-200';
			case 'example': return 'bg-green-50 border-green-200';
			case 'application': return 'bg-purple-50 border-purple-200';
			case 'summary': return 'bg-yellow-50 border-yellow-200';
			default: return 'bg-white border-zinc-200';
		}
	};

	const getSectionTitleColor = (type: string) => {
		switch (type) {
			case 'introduction': return 'text-blue-900';
			case 'explanation': return 'text-zinc-900';
			case 'example': return 'text-green-900';
			case 'application': return 'text-purple-900';
			case 'summary': return 'text-yellow-900';
			default: return 'text-zinc-900';
		}
	};

	// Render markdown content to HTML
	const renderedContent = $derived(marked(section.content));
</script>

<div class="bg-white rounded-lg border border-zinc-200 overflow-hidden">
	<!-- Section header -->
	<div class="px-8 py-6 border-b border-zinc-200 {getSectionBgColor(section.type)}">
		<div class="flex items-center space-x-3">
			{#snippet icon()}
				{@const Icon = getSectionIcon(section.type)}
				<Icon class="h-5 w-5 {getSectionTitleColor(section.type)}" />
			{/snippet}
			{@render icon()}
			<h2 class="text-xl font-semibold {getSectionTitleColor(section.type)}">
				{section.title}
			</h2>
			<span class="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium {getSectionTitleColor(section.type)} capitalize">
				{section.type}
			</span>
		</div>
	</div>

	<!-- Section content -->
	<div class="px-8 py-6">
		<div class="prose prose-zinc max-w-none">
			{@html renderedContent}
		</div>

		<!-- Code examples -->
		{#if section.codeExamples && section.codeExamples.length > 0}
			<div class="mt-6 space-y-4">
				<h3 class="text-lg font-semibold text-zinc-900 flex items-center">
					<Code class="h-4 w-4 mr-2" />
					Code Examples
				</h3>
				{#each section.codeExamples as example}
					<div class="bg-zinc-900 rounded-lg overflow-hidden">
						<div class="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm font-medium">
							{example.language} - {example.description}
						</div>
						<pre class="p-4 text-sm text-zinc-100 overflow-x-auto"><code>{example.code}</code></pre>
						{#if example.output}
							<div class="px-4 py-2 bg-zinc-800 border-t border-zinc-700">
								<div class="text-zinc-400 text-xs mb-1">Output:</div>
								<pre class="text-green-300 text-sm"><code>{example.output}</code></pre>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Visual aids -->
		{#if section.visualAids && section.visualAids.length > 0}
			<div class="mt-6 space-y-4">
				<h3 class="text-lg font-semibold text-zinc-900 flex items-center">
					<Image class="h-4 w-4 mr-2" />
					Visual Aids
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each section.visualAids as aid}
						<div class="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
							{#if aid.type === 'image' && aid.url}
								<img 
									src={aid.url} 
									alt={aid.altText}
									class="w-full h-auto rounded-md mb-2"
								/>
							{:else if aid.type === 'video' && aid.url}
								<div class="aspect-video bg-zinc-200 rounded-md flex items-center justify-center mb-2">
									<Play class="h-8 w-8 text-zinc-500" />
								</div>
							{:else}
								<div class="aspect-video bg-zinc-200 rounded-md flex items-center justify-center mb-2">
									<Image class="h-8 w-8 text-zinc-500" />
								</div>
							{/if}
							<p class="text-sm text-zinc-600">{aid.description}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Subsections -->
		{#if section.subsections && section.subsections.length > 0}
			<div class="mt-6 space-y-4">
				{#each section.subsections as subsection}
					<div class="border-l-4 border-zinc-200 pl-6">
						<h3 class="text-lg font-medium text-zinc-900 mb-2">
							{subsection.title}
						</h3>
						<div class="prose prose-zinc max-w-none text-zinc-700">
							{@html marked(subsection.content)}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
