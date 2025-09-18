<script lang="ts">
	import { Link, FileText, Video, Globe, ExternalLink } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	
	let url = $state('');
	let isLoading = $state(false);
	let isValidUrl = $state(false);
	
	const validateUrl = (inputUrl: string) => {
		try {
			new URL(inputUrl);
			return true;
		} catch {
			return false;
		}
	};
	
	$effect(() => {
		isValidUrl = url.trim() !== '' && validateUrl(url.trim());
	});
	
	const handleSubmit = async () => {
		if (!isValidUrl) return;
		
		isLoading = true;
		// Navigate to explore page with the URL
		await goto(`/explore?url=${encodeURIComponent(url.trim())}`);
		isLoading = false;
	};
	
	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	};
	
	const exampleUrls = [
		{
			url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
			title: 'Wikipedia: Artificial Intelligence',
			type: 'article'
		},
		{
			url: 'https://www.youtube.com/watch?v=aircAruvnKk',
			title: 'YouTube: Neural Networks Explained',
			type: 'video'
		},
		{
			url: 'https://www.nature.com/articles/nature14539',
			title: 'Nature: Deep Learning Research',
			type: 'research'
		}
	];
	
	const getUrlIcon = (type: string) => {
		switch (type) {
			case 'video': return Video;
			case 'research': return FileText;
			default: return Globe;
		}
	};
</script>

<div class="space-y-8">
	<!-- URL Input -->
	<div class="space-y-4">
		<div class="relative">
			<Link class="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
			<input
				type="url"
				bind:value={url}
				onkeypress={handleKeyPress}
				placeholder="Paste any article, video, or webpage URL..."
				class="form-input w-full pl-4 pr-14 py-4 text-base placeholder-zinc-400 {!isValidUrl && url.trim() !== '' ? 'border-red-300 focus:border-red-500' : ''}"
				disabled={isLoading}
			/>
		</div>
		
		{#if !isValidUrl && url.trim() !== ''}
			<p class="text-red-500 text-sm font-inter">Please enter a valid URL</p>
		{/if}
		
		<!-- Submit Button -->
		<button
			onclick={handleSubmit}
			disabled={!isValidUrl || isLoading}
			class="btn btn-primary w-full py-4 text-base"
		>
			{#if isLoading}
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
				<span>Analyzing Content...</span>
			{:else}
				<ExternalLink class="h-5 w-5 mr-2" />
				<span>Analyze Content</span>
			{/if}
		</button>
	</div>
	
	<!-- Example URLs -->
	<div class="space-y-4">
		<div class="flex items-center space-x-2 text-zinc-600">
			<FileText class="h-4 w-4" />
			<span class="text-sm font-medium font-inter">Try these examples:</span>
		</div>
		
		<div class="space-y-3">
			{#each exampleUrls as example}
				<button
					onclick={() => { url = example.url; handleSubmit(); }}
					class="w-full flex items-center space-x-3 p-4 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-lg text-left transition-all duration-200 group"
					disabled={isLoading}
				>
				<div class="p-2 bg-zinc-100 group-hover:bg-zinc-200 rounded-lg transition-colors duration-200">
					{#if example.type === 'video'}
						<Video class="h-4 w-4 text-zinc-600" />
					{:else if example.type === 'research'}
						<FileText class="h-4 w-4 text-zinc-600" />
					{:else}
						<Globe class="h-4 w-4 text-zinc-600" />
					{/if}
				</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-zinc-900 text-sm truncate font-inter">{example.title}</p>
						<p class="text-xs text-zinc-500 truncate font-inter">{example.url}</p>
					</div>
					<ExternalLink class="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-200" />
				</button>
			{/each}
		</div>
	</div>
	
	<!-- Supported Content Types -->
	<div class="bg-zinc-100 border border-zinc-200 rounded-lg p-6">
		<h4 class="font-medium text-zinc-900 text-sm mb-4 font-inter">Supported Content:</h4>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
			<div class="flex items-center space-x-2 text-zinc-700">
				<Globe class="h-3 w-3" />
				<span class="font-inter">Articles & Blogs</span>
			</div>
			<div class="flex items-center space-x-2 text-zinc-700">
				<Video class="h-3 w-3" />
				<span class="font-inter">YouTube Videos</span>
			</div>
			<div class="flex items-center space-x-2 text-zinc-700">
				<FileText class="h-3 w-3" />
				<span class="font-inter">Research Papers</span>
			</div>
			<div class="flex items-center space-x-2 text-zinc-700">
				<Link class="h-3 w-3" />
				<span class="font-inter">Web Pages</span>
			</div>
		</div>
	</div>
</div>
