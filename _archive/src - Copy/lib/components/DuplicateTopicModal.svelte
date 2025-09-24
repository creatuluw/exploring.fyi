<script lang="ts">
	import { Brain, RotateCcw, Sparkles, X, Loader2 } from 'lucide-svelte';
	
	interface Props {
		open: boolean;
		topicTitle: string;
		existingTopic: any;
		onContinue: () => void;
		onStartNew: () => void;
		onClose: () => void;
	}

	let { open = $bindable(), topicTitle, existingTopic, onContinue, onStartNew, onClose }: Props = $props();
	
	// Loading states for buttons
	let isLoadingContinue = $state(false);
	let isLoadingStartNew = $state(false);

	function formatTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
		return 'Just now';
	}

	async function handleContinue() {
		isLoadingContinue = true;
		try {
			await onContinue();
			open = false;
		} catch (error) {
			console.error('Error continuing previous exploration:', error);
			isLoadingContinue = false;
		}
	}

	async function handleStartNew() {
		isLoadingStartNew = true;
		try {
			await onStartNew();
			open = false;
		} catch (error) {
			console.error('Error starting new exploration:', error);
			isLoadingStartNew = false;
		}
	}

	function handleClose() {
		onClose();
		open = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- Modal backdrop -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="duplicate-topic-title"
		tabindex="-1"
	>
		<!-- Modal content -->
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
			<!-- Close button -->
			<button
				onclick={handleClose}
				class="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
				aria-label="Close modal"
			>
				<X class="h-4 w-4" />
			</button>

			<!-- Header -->
			<div class="p-6 pb-4">
				<div class="flex items-center space-x-3 mb-4">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
							<Brain class="h-6 w-6 text-blue-600" />
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<h3 id="duplicate-topic-title" class="text-lg font-semibold text-zinc-900 mb-1">
							Topic Already Explored
						</h3>
						<p class="text-sm text-zinc-600">
							You've explored "{topicTitle}" before
						</p>
					</div>
				</div>

				<!-- Existing topic info -->
				{#if existingTopic}
					<div class="bg-zinc-50 rounded-lg p-4 mb-4">
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm font-medium text-zinc-700">Previous exploration</span>
							<span class="text-xs text-zinc-500">
								{formatTimeAgo(existingTopic.created_at)}
							</span>
						</div>
						
						{#if existingTopic.mindMap}
							<div class="flex items-center space-x-4 text-xs text-zinc-600">
								<div class="flex items-center space-x-1">
									<Brain class="h-3 w-3" />
									<span>{existingTopic.mindMap.nodeCount} nodes</span>
								</div>
								<div class="flex items-center space-x-1">
									<span>•</span>
									<span>{existingTopic.mindMap.edgeCount} connections</span>
								</div>
							</div>
						{:else}
							<p class="text-xs text-zinc-500">Mind map in progress...</p>
						{/if}
					</div>
				{/if}

				<p class="text-sm text-zinc-600 mb-6">
					Would you like to continue where you left off, or start a fresh exploration?
				</p>
			</div>

			<!-- Actions -->
			<div class="px-6 pb-6 space-y-3">
				<!-- Continue button -->
				<button
					onclick={handleContinue}
					disabled={isLoadingContinue || isLoadingStartNew}
					class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoadingContinue}
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Loading previous exploration...</span>
					{:else}
						<RotateCcw class="h-4 w-4" />
						<span>Continue Previous Exploration</span>
					{/if}
				</button>

				<!-- Start new button -->
				<button
					onclick={handleStartNew}
					disabled={isLoadingContinue || isLoadingStartNew}
					class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoadingStartNew}
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Starting fresh exploration...</span>
					{:else}
						<Sparkles class="h-4 w-4" />
						<span>Start Fresh Exploration</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
