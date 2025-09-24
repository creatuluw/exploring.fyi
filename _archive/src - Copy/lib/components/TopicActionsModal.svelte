<script lang="ts">
	import { Trash2, X } from 'lucide-svelte';
	import { TopicsService } from '$lib/database/topics.js';
	
	// Props
	export let open = false;
	export let topic: any = null;
	
	// Events
	export let onclose: () => void = () => {};
	export let ondeleted: () => void = () => {};
	
	// State for confirmation modal
	let showConfirmDelete = false;
	let confirmationText = '';
	let isDeleting = false;
	let deleteError = '';
	
	// Computed confirmation text that user needs to type
	$: requiredConfirmationText = topic ? `I am aware that with this i will delete all my progress and data for ${topic.title}` : '';
	$: isConfirmationValid = confirmationText.trim() === requiredConfirmationText;
	
	// Close handlers
	const handleClose = () => {
		resetState();
		onclose();
	};
	
	const resetState = () => {
		showConfirmDelete = false;
		confirmationText = '';
		isDeleting = false;
		deleteError = '';
	};
	
	// Delete handlers
	const handleDeleteClick = () => {
		showConfirmDelete = true;
		confirmationText = '';
		deleteError = '';
	};
	
	const handleCancelDelete = () => {
		showConfirmDelete = false;
		confirmationText = '';
		deleteError = '';
	};
	
	const handleConfirmDelete = async () => {
		if (!topic || !isConfirmationValid) return;
		
		isDeleting = true;
		deleteError = '';
		
		try {
			console.log(`🗑️ [TopicActions] Deleting topic: ${topic.id} - "${topic.title}"`);
			const success = await TopicsService.deleteTopic(topic.id);
			
			if (success) {
				console.log(`✅ [TopicActions] Successfully deleted topic: ${topic.id}`);
				ondeleted();
				handleClose();
			} else {
				deleteError = 'Failed to delete topic. Please try again.';
			}
		} catch (error) {
			console.error('❌ [TopicActions] Error deleting topic:', error);
			deleteError = 'An error occurred while deleting the topic.';
		} finally {
			isDeleting = false;
		}
	};
	
	// Handle escape key
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			if (showConfirmDelete) {
				handleCancelDelete();
			} else {
				handleClose();
			}
		}
	};
</script>

<!-- Main Modal -->
{#if open && topic}
	<!-- Modal backdrop -->
	<div
		class="fixed inset-0 bg-gray-900/30 z-50 transition-opacity"
		onclick={handleClose}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	></div>
	
	<!-- Modal dialog -->
	<div
		class="fixed inset-0 z-50 overflow-hidden flex items-center my-4 justify-center px-4 sm:px-6"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-auto max-w-lg w-full max-h-full" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
			<!-- Modal header -->
			<div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700/60">
				<div class="flex justify-between items-center">
					<div class="font-semibold text-gray-800 dark:text-gray-100">Topic Actions</div>
					<button class="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400" onclick={handleClose}>
						<div class="sr-only">Close</div>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>
			
			<!-- Modal content -->
			<div class="px-5 py-4">
				<div class="text-sm mb-4">
					<div class="font-medium text-gray-800 dark:text-gray-100 mb-2">
						{topic.title}
					</div>
					<div class="text-gray-600 dark:text-gray-400 text-xs">
						Created: {new Date(topic.created_at).toLocaleDateString()}
						{#if topic.mindMap}
							• {topic.mindMap.nodeCount} nodes • {topic.mindMap.edgeCount} connections
						{/if}
					</div>
				</div>
				
				<!-- Action buttons -->
				<div class="space-y-3">
					<button
						onclick={handleDeleteClick}
						class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
					>
						<Trash2 class="w-4 h-4" />
						<span>Delete Topic & All Data</span>
					</button>
					
					<div class="text-xs text-zinc-500 px-1">
						⚠️ This will permanently delete the topic, mind map, progress, and all associated data.
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmDelete && topic}
	<!-- Modal backdrop -->
	<div
		class="fixed inset-0 bg-gray-900/50 z-60 transition-opacity"
		onclick={handleCancelDelete}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	></div>
	
	<!-- Modal dialog -->
	<div
		class="fixed inset-0 z-60 overflow-hidden flex items-center my-4 justify-center px-4 sm:px-6"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-auto max-w-lg w-full max-h-full" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
			<!-- Modal header -->
			<div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700/60">
				<div class="flex justify-between items-center">
					<div class="font-semibold text-gray-800 dark:text-gray-100 text-red-600">Confirm Deletion</div>
					<button class="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400" onclick={handleCancelDelete}>
						<div class="sr-only">Close</div>
						<X class="w-4 h-4" />
					</button>
				</div>
			</div>
			
			<!-- Modal content -->
			<div class="px-5 py-4">
				<div class="text-sm space-y-4">
					<div class="flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
						<Trash2 class="w-6 h-6 text-red-500 flex-shrink-0" />
						<div>
							<div class="font-medium text-red-800 dark:text-red-200">This action cannot be undone!</div>
							<div class="text-red-600 dark:text-red-300 text-xs">All progress and data for "{topic.title}" will be permanently deleted.</div>
						</div>
					</div>
					
					<div>
						<label for="confirmation-text" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Type the following text to confirm:
						</label>
						<div class="text-xs text-gray-600 dark:text-gray-400 mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded italic">
							{requiredConfirmationText}
						</div>
						<input
							id="confirmation-text"
							type="text"
							bind:value={confirmationText}
							placeholder="Type the confirmation text above..."
							class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 placeholder:text-xs placeholder:text-gray-400"
							disabled={isDeleting}
						/>
					</div>
					
					{#if deleteError}
						<div class="text-red-600 dark:text-red-400 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
							{deleteError}
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Modal footer -->
			<div class="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
				<div class="flex flex-wrap justify-end space-x-3">
					<button 
						class="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium px-3 py-2 text-sm rounded-md transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed" 
						onclick={handleCancelDelete}
						disabled={isDeleting}
					>
						Cancel
					</button>
					<button 
						class="bg-rose-500 hover:bg-rose-600 text-white font-medium px-3 py-2 text-sm rounded-md transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						onclick={handleConfirmDelete}
						disabled={!isConfirmationValid || isDeleting}
					>
						{#if isDeleting}
							<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
							Deleting...
						{:else}
							Delete Permanently
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
