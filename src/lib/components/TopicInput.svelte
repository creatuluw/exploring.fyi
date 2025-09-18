<script lang="ts">
	import { Search, Lightbulb, Sparkles } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	
	let topic = $state('');
	let suggestions = $state([
		'Machine Learning',
		'Climate Change',
		'Ancient Rome',
		'Quantum Physics',
		'Renaissance Art',
		'Blockchain Technology',
		'Human Psychology',
		'Space Exploration'
	]);
	let isLoading = $state(false);
	
	const handleSubmit = async () => {
		if (!topic.trim()) return;
		
		isLoading = true;
		// Navigate to explore page with the topic
		await goto(`/explore?topic=${encodeURIComponent(topic.trim())}`);
		isLoading = false;
	};
	
	const handleSuggestionClick = (suggestion: string) => {
		topic = suggestion;
		handleSubmit();
	};
	
	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	};
</script>

<div class="space-y-8">
	<!-- Topic Input -->
	<div class="space-y-4">
		<div class="relative">
			<Search class="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
			<input
				type="text"
				bind:value={topic}
				onkeypress={handleKeyPress}
				placeholder="Enter any topic you want to explore..."
				class="form-input w-full pl-4 pr-14 py-4 text-base placeholder-zinc-400"
				disabled={isLoading}
			/>
		</div>
		
		<!-- Submit Button -->
		<button
			onclick={handleSubmit}
			disabled={!topic.trim() || isLoading}
			class="btn btn-primary w-full py-4 text-base"
		>
			{#if isLoading}
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
				<span>Generating Mind Map...</span>
			{:else}
				<Sparkles class="h-5 w-5 mr-2" />
				<span>Explore with AI</span>
			{/if}
		</button>
	</div>
	
	<!-- Suggestions -->
	<div class="space-y-4">
		<div class="flex items-center space-x-2 text-zinc-600">
			<Lightbulb class="h-4 w-4" />
			<span class="text-sm font-medium font-inter">Popular topics to explore:</span>
		</div>
		
		<div class="flex flex-wrap gap-2">
			{#each suggestions as suggestion}
				<button
					onclick={() => handleSuggestionClick(suggestion)}
					class="btn btn-secondary text-sm py-2 px-4"
					disabled={isLoading}
				>
					{suggestion}
				</button>
			{/each}
		</div>
	</div>
	
	<!-- Features Preview -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="card">
			<div class="flex items-start space-x-3">
				<div class="p-2 bg-zinc-100 rounded-lg">
					<Search class="h-4 w-4 text-zinc-700" />
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 text-sm font-inter">AI-Powered Analysis</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">Get comprehensive breakdowns of any topic</p>
				</div>
			</div>
		</div>
		
		<div class="card">
			<div class="flex items-start space-x-3">
				<div class="p-2 bg-zinc-100 rounded-lg">
					<Sparkles class="h-4 w-4 text-zinc-700" />
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 text-sm font-inter">Interactive Mind Maps</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">Explore connections visually</p>
				</div>
			</div>
		</div>
		
		<div class="card">
			<div class="flex items-start space-x-3">
				<div class="p-2 bg-zinc-100 rounded-lg">
					<Lightbulb class="h-4 w-4 text-zinc-700" />
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 text-sm font-inter">Deep Learning</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">Dive deeper into any concept</p>
				</div>
			</div>
		</div>
	</div>
</div>
