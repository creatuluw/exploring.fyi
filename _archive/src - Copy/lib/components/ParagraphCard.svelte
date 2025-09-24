<script lang="ts">
	import { Check, CheckCircle, MessageCircle } from 'lucide-svelte';
	import { marked } from 'marked';
	import { session } from '$lib/stores/session.js';
	import { ParagraphProgressService } from '$lib/database/paragraphProgress.js';
	import { get } from 'svelte/store';

	interface Props {
		content: string;
		paragraphId: string;
		sectionId: string;
		sectionTitle: string;
		topicId: string;
		topicTitle: string;
		isRead?: boolean;
		onReadStatusChange?: (paragraphId: string, isRead: boolean) => void;
		onOpenChat?: (paragraphId: string, content: string) => void;
	}

	let { 
		content, 
		paragraphId, 
		sectionId, 
		sectionTitle,
		topicId, 
		topicTitle,
		isRead = false,
		onReadStatusChange,
		onOpenChat
	}: Props = $props();

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	let isUpdating = $state(false);
	let currentReadStatus = $state(isRead);

	// Watch for prop changes
	$effect(() => {
		currentReadStatus = isRead;
	});

	const toggleReadStatus = async () => {
		if (isUpdating) return;

		const sessionState = get(session);
		if (!sessionState?.id) {
			console.warn('⚠️ [Paragraph Card] No session available for tracking progress');
			return;
		}

		isUpdating = true;
		const newReadStatus = !currentReadStatus;

		try {
			let success: boolean;
			
			if (newReadStatus) {
				success = await ParagraphProgressService.markAsRead(
					sessionState.id,
					topicId,
					sectionId,
					paragraphId,
					content
				);
			} else {
				success = await ParagraphProgressService.markAsUnread(
					sessionState.id,
					topicId,
					sectionId,
					paragraphId,
					content
				);
			}

			if (success) {
				currentReadStatus = newReadStatus;
				onReadStatusChange?.(paragraphId, newReadStatus);
				console.log(`✅ [Paragraph Card] Updated read status for paragraph ${paragraphId}: ${newReadStatus}`);
			} else {
				console.error('❌ [Paragraph Card] Failed to update read status');
			}
		} catch (error) {
			console.error('❌ [Paragraph Card] Error updating read status:', error);
		} finally {
			isUpdating = false;
		}
	};

	// Render markdown content to HTML
	const renderedContent = $derived(marked(content));

	function handleChatClick() {
		onOpenChat?.(paragraphId, content);
	}
</script>

<div class="group relative bg-white rounded-lg border border-zinc-200 p-6 transition-all duration-200 hover:shadow-md {currentReadStatus ? 'bg-green-50/30 border-green-200' : ''}">
	<!-- Action buttons -->
	<div class="absolute top-4 right-4 flex items-center space-x-2">
		<!-- Chat button -->
		<button 
			onclick={handleChatClick}
			class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 opacity-0 group-hover:opacity-100 hover:scale-105"
			title="Ask AI about this paragraph"
		>
			<MessageCircle class="w-4 h-4" />
		</button>

		<!-- Read status indicator -->
		<button 
			onclick={toggleReadStatus}
			disabled={isUpdating}
			class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 {
				currentReadStatus 
					? 'bg-green-500 text-white shadow-md' 
					: 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'
			} {isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}"
			title={currentReadStatus ? 'Mark as unread' : 'Mark as read'}
		>
			{#if isUpdating}
				<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
			{:else if currentReadStatus}
				<CheckCircle class="w-4 h-4" />
			{:else}
				<Check class="w-4 h-4" />
			{/if}
		</button>
	</div>

	<!-- Paragraph content -->
	<div class="pr-20">
		<div class="prose prose-zinc prose-sm max-w-none {currentReadStatus ? 'opacity-75' : ''}">
			{@html renderedContent}
		</div>
	</div>

	<!-- Optional read indicator overlay -->
	{#if currentReadStatus}
		<div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-green-50/0 to-green-50/20 rounded-lg"></div>
	{/if}
</div>

<style>
	/* Custom prose styling for paragraph cards */
	:global(.prose-sm p) {
		margin-bottom: 0.75rem;
	}
	
	:global(.prose-sm p:last-child) {
		margin-bottom: 0;
	}
	
	:global(.prose-sm h1, .prose-sm h2, .prose-sm h3, .prose-sm h4, .prose-sm h5, .prose-sm h6) {
		margin-top: 0;
		margin-bottom: 0.5rem;
	}
	
	:global(.prose-sm ul, .prose-sm ol) {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
