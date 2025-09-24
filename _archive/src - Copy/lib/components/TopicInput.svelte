<script lang="ts">
	import { Search, Lightbulb, Sparkles } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { TopicsService } from '$lib/database/topics.js';
	import { ErrorRecovery } from '$lib/utils/errorRecovery.js';
	import { t } from '$lib/i18n/index.js';
	
	let topic = $state('');
	// Reactive suggestions based on current language
	let suggestions = $derived([
		$t('topic_input.suggestions.machine_learning'),
		$t('topic_input.suggestions.climate_change'),
		$t('topic_input.suggestions.ancient_rome'),
		$t('topic_input.suggestions.quantum_physics'),
		$t('topic_input.suggestions.renaissance_art'),
		$t('topic_input.suggestions.building_websites'),
		$t('topic_input.suggestions.human_psychology'),
		$t('topic_input.suggestions.space_exploration'),
		// K12-friendly topics
		$t('topic_input.suggestions.solar_system'),
		$t('topic_input.suggestions.world_war_ii'),
		$t('topic_input.suggestions.human_anatomy'),
		$t('topic_input.suggestions.elementary_math')
	]);
	let isLoading = $state(false);
	
	const handleSubmit = async () => {
		if (!topic.trim() || isLoading) return;
		
		// Optimistic UI: Navigate immediately for instant feedback
		const trimmedTopic = topic.trim();
		console.log(`🚀 [TopicInput] Optimistic navigation for: "${trimmedTopic}"`);
		
		// Navigate immediately - this is the optimistic update
		await goto(`/explore?topic=${encodeURIComponent(trimmedTopic)}`);
		
		// Background: Check for existing topic for future optimization
		// This runs after navigation so it doesn't block the UI
		try {
			console.log(`🔍 [TopicInput] Background check for existing topic: "${trimmedTopic}"`);
			const existingTopic = await TopicsService.findExistingTopicByTitle(trimmedTopic);
			
			if (existingTopic) {
				console.log(`✅ [TopicInput] Found existing topic in background: ${existingTopic.id}`);
				// Could potentially redirect to resume, but for now let the explore page handle it
			}
		} catch (error) {
			console.warn('Background topic check failed:', error);
			// Don't show error to user since navigation already happened
		}
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
				placeholder="{$t('topic_input.placeholder')}"
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
				<span>{$t('topic_input.loading')}</span>
			{:else}
				<Sparkles class="h-5 w-5 mr-2" />
				<span>{$t('topic_input.button')}</span>
			{/if}
		</button>
	</div>
	
	<!-- Suggestions -->
	<div class="space-y-4">
		<div class="flex items-center space-x-2 text-zinc-600">
			<Lightbulb class="h-4 w-4" />
			<span class="text-sm font-medium font-inter">{$t('topic_input.popular_topics')}</span>
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
					<h4 class="font-medium text-zinc-900 text-sm font-inter">{$t('topic_input.ai_powered_analysis')}</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">{$t('topic_input.ai_powered_analysis_desc')}</p>
				</div>
			</div>
		</div>
		
		<div class="card">
			<div class="flex items-start space-x-3">
				<div class="p-2 bg-zinc-100 rounded-lg">
					<Sparkles class="h-4 w-4 text-zinc-700" />
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 text-sm font-inter">{$t('topic_input.interactive_mind_maps')}</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">{$t('topic_input.interactive_mind_maps_desc')}</p>
				</div>
			</div>
		</div>
		
		<div class="card">
			<div class="flex items-start space-x-3">
				<div class="p-2 bg-zinc-100 rounded-lg">
					<Lightbulb class="h-4 w-4 text-zinc-700" />
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 text-sm font-inter">{$t('topic_input.deep_learning')}</h4>
					<p class="text-xs text-zinc-600 mt-1 font-inter">{$t('topic_input.deep_learning_desc')}</p>
				</div>
			</div>
		</div>
	</div>
</div>
