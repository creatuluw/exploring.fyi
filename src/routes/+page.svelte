<script lang="ts">
	import { Brain, Sparkles, ArrowRight, Users, Star, Zap, Upload } from 'lucide-svelte';
	import TopicInput from '$lib/components/TopicInput.svelte';
	import UrlInput from '$lib/components/UrlInput.svelte';
	import ImageInput from '$lib/components/ImageInput.svelte';
	import { t } from '$lib/i18n/index.js';
	
	let activeTab = $state<'topic' | 'url' | 'image'>('topic');
	
	const setActiveTab = (tab: 'topic' | 'url' | 'image') => {
		activeTab = tab;
	};
</script>

<svelte:head>
	<title>Explore.fyi - {$t('landing.title')}</title>
	<meta name="description" content="{$t('landing.subtitle')}" />
</svelte:head>

<!-- Hero Section -->
<section class="relative bg-gradient-to-b from-zinc-50 to-white pt-16 pb-8 lg:pt-20 lg:pb-12">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center space-y-8">
			<!-- Hero Headline -->
			<div class="space-y-6 max-w-2xl mx-auto">
				<h1 class="h1">
					{$t('landing.title')}
				</h1>
				<p class="text-lead">
					{$t('landing.subtitle')}
				</p>
			</div>
			
			<!-- Social Proof -->
			<div class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-zinc-500">
				<div class="flex items-center space-x-2">
					<Users class="h-4 w-4" />
					<span class="text-sm font-inter">{$t('landing.trusted_by')}</span>
				</div>
				<div class="flex items-center space-x-1">
					{#each Array(5) as _}
						<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
					{/each}
					<span class="text-sm font-inter ml-2">{$t('landing.rating')}</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Input Section -->
<section class="pt-8 pb-20 bg-white">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Tab Navigation -->
		<div class="flex justify-center mb-12">
			<div class="flex bg-zinc-100 rounded-lg p-1 border border-zinc-200">
				<button
					onclick={() => setActiveTab('topic')}
					class="px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 {activeTab === 'topic' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					<div class="flex items-center space-x-2">
						<Brain class="h-4 w-4" />
						<span>{$t('landing.explore_topic')}</span>
					</div>
				</button>
				<button
					onclick={() => setActiveTab('url')}
					class="px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 {activeTab === 'url' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					<div class="flex items-center space-x-2">
						<Sparkles class="h-4 w-4" />
						<span>{$t('landing.analyze_url')}</span>
					</div>
				</button>
				<button
					onclick={() => setActiveTab('image')}
					class="px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 {activeTab === 'image' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600 hover:text-zinc-900'}"
				>
					<div class="flex items-center space-x-2">
						<Upload class="h-4 w-4" />
						<span>{$t('landing.upload_image')}</span>
					</div>
				</button>
			</div>
		</div>
		
		<!-- Input Components -->
		<div class="bg-zinc-50 border border-zinc-200 rounded-xl p-8 lg:p-12">
			{#if activeTab === 'topic'}
				<TopicInput />
			{:else if activeTab === 'url'}
				<UrlInput />
			{:else if activeTab === 'image'}
				<ImageInput />
			{/if}
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-24 bg-zinc-50">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center space-y-4 mb-20">
			<h2 class="h2">
				Why Choose Explore.fyi?
			</h2>
			<p class="text-lead max-w-2xl mx-auto">
				Experience learning like never before with our AI-powered platform
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Brain class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					AI-Powered Analysis
				</h3>
				<p class="text-body">
					Our advanced AI breaks down complex topics into digestible, interconnected concepts that make learning intuitive and comprehensive.
				</p>
			</div>
			
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Sparkles class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					Interactive Mind Maps
				</h3>
				<p class="text-body">
					Visualize knowledge through dynamic, interactive mind maps that let you explore connections and dive deeper into any concept.
				</p>
			</div>
			
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Zap class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					Instant Understanding
				</h3>
				<p class="text-body">
					Transform any topic or URL into structured knowledge in seconds. From Wikipedia articles to research papers, we make it all accessible.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-24 bg-zinc-900">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
		<div class="space-y-8">
			<h2 class="text-4xl md:text-5xl font-inter-tight font-bold text-white tracking-tight">
				Ready to Transform How You Learn?
			</h2>
			<p class="text-lg text-zinc-300 max-w-2xl mx-auto font-inter leading-relaxed">
				Join thousands of learners who are already exploring knowledge in a whole new way.
			</p>
			<button class="bg-white hover:bg-zinc-50 text-zinc-900 font-semibold px-8 py-4 rounded-md transition-all duration-200 inline-flex items-center space-x-2 text-base shadow-lg hover:shadow-xl">
				<span>Start Exploring Now</span>
				<ArrowRight class="h-4 w-4" />
			</button>
		</div>
	</div>
</section>
