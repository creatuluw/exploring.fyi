<script lang="ts">
	import { X, Send, MessageCircle, Loader2, Save, Trash2 } from 'lucide-svelte';
	import { marked } from 'marked';
	import { session } from '$lib/stores/session.js';
	import { ParagraphQAService, type QuestionAnswer } from '$lib/database/paragraphQA.js';
	import { get } from 'svelte/store';

	interface Props {
		isOpen: boolean;
		paragraphContent: string;
		paragraphId: string;
		sectionId: string;
		sectionTitle: string;
		topicId: string;
		topicTitle: string;
		onClose: () => void;
	}

	let { 
		isOpen, 
		paragraphContent, 
		paragraphId, 
		sectionId, 
		sectionTitle,
		topicId, 
		topicTitle, 
		onClose 
	}: Props = $props();

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	// State
	let question = $state('');
	let isLoading = $state(false);
	let currentAnswer = $state('');
	let savedQAs = $state<QuestionAnswer[]>([]);
	let isSaving = $state(false);
	let showSaveButton = $state(false);

	// Load existing Q&As when drawer opens
	$effect(() => {
		if (isOpen) {
			loadExistingQAs();
			// Reset state
			question = '';
			currentAnswer = '';
			showSaveButton = false;
		}
	});

	async function loadExistingQAs() {
		const sessionState = get(session);
		if (!sessionState?.id) return;

		try {
			const qas = await ParagraphQAService.getParagraphQAs(
				sessionState.id,
				topicId,
				sectionId,
				paragraphId
			);
			savedQAs = qas;
			console.log(`📚 [Paragraph Chat] Loaded ${qas.length} existing Q&As for paragraph`);
		} catch (error) {
			console.error('❌ [Paragraph Chat] Error loading existing Q&As:', error);
		}
	}

	async function askQuestion() {
		if (!question.trim() || isLoading) return;

		isLoading = true;
		showSaveButton = false;
		currentAnswer = '';

		try {
			console.log(`❓ [Paragraph Chat] Asking question: "${question}"`);

			const response = await fetch('/api/paragraph-question', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					question: question.trim(),
					paragraphContent,
					sectionTitle,
					topicTitle,
					context: `This is paragraph ${paragraphId} from section "${sectionTitle}" in the topic "${topicTitle}".`
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.details || 'Failed to get answer');
			}

			const result = await response.json();

			if (!result.success || !result.data?.answer) {
				throw new Error('No answer received from AI');
			}

			currentAnswer = result.data.answer;
			showSaveButton = true;
			console.log(`✅ [Paragraph Chat] Received answer for question`);

		} catch (error) {
			console.error('❌ [Paragraph Chat] Error asking question:', error);
			currentAnswer = `Sorry, I encountered an error while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}`;
		} finally {
			isLoading = false;
		}
	}

	async function saveCurrentQA() {
		if (!currentAnswer || !question.trim() || isSaving) return;

		const sessionState = get(session);
		if (!sessionState?.id) {
			console.warn('⚠️ [Paragraph Chat] No session available for saving Q&A');
			return;
		}

		isSaving = true;

		try {
			const qaId = await ParagraphQAService.saveQA(
				sessionState.id,
				topicId,
				sectionId,
				paragraphId,
				paragraphContent,
				question.trim(),
				currentAnswer
			);

			if (qaId) {
				// Add to saved Q&As list
				savedQAs = [{
					id: qaId,
					question: question.trim(),
					answer: currentAnswer,
					aiModel: 'gemini-2.5-flash',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}, ...savedQAs];

				// Clear current Q&A
				question = '';
				currentAnswer = '';
				showSaveButton = false;
				
				console.log(`✅ [Paragraph Chat] Saved Q&A with ID: ${qaId}`);
			}
		} catch (error) {
			console.error('❌ [Paragraph Chat] Error saving Q&A:', error);
		} finally {
			isSaving = false;
		}
	}

	async function deleteQA(qaId: string) {
		const sessionState = get(session);
		if (!sessionState?.id) return;

		try {
			const success = await ParagraphQAService.deleteQA(sessionState.id, qaId);
			if (success) {
				savedQAs = savedQAs.filter(qa => qa.id !== qaId);
				console.log(`✅ [Paragraph Chat] Deleted Q&A ${qaId}`);
			}
		} catch (error) {
			console.error('❌ [Paragraph Chat] Error deleting Q&A:', error);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			askQuestion();
		}
	}

	// Render markdown content
	const renderedParagraphContent = $derived(marked(paragraphContent));
	const renderedCurrentAnswer = $derived(currentAnswer ? marked(currentAnswer) : '');
</script>

<!-- Backdrop -->
{#if isOpen}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="0"
		aria-label="Close chat drawer"
	></div>
{/if}

<!-- Drawer -->
<div class="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 z-50 {isOpen ? 'translate-x-0' : 'translate-x-full'}">
	<div class="flex flex-col h-full">
		<!-- Header -->
		<div class="flex items-center justify-between p-6 border-b border-zinc-200 bg-zinc-50">
			<div class="flex items-center space-x-3">
				<MessageCircle class="h-5 w-5 text-blue-600" />
				<div>
					<h2 class="text-lg font-semibold text-zinc-900">Ask About This Paragraph</h2>
					<p class="text-sm text-zinc-600">{sectionTitle} • {topicTitle}</p>
				</div>
			</div>
			<button 
				onclick={onClose}
				class="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
			>
				<X class="h-5 w-5 text-zinc-600" />
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			<!-- Paragraph Context -->
			<div class="p-6 bg-blue-50 border-b border-blue-200">
				<h3 class="text-sm font-medium text-blue-900 mb-2">Paragraph Context:</h3>
				<div class="prose prose-sm prose-blue max-w-none">
					{@html renderedParagraphContent}
				</div>
			</div>

			<!-- Current Conversation -->
			<div class="p-6 space-y-6">
				<!-- Question Input -->
				<div class="space-y-3">
					<label for="question" class="block text-sm font-medium text-zinc-900">
						Ask a question about this paragraph:
					</label>
					<div class="flex space-x-2">
						<textarea
							id="question"
							bind:value={question}
							onkeydown={handleKeyDown}
							placeholder="What would you like to know about this content?"
							class="flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							rows="2"
							disabled={isLoading}
						></textarea>
						<button
							onclick={askQuestion}
							disabled={!question.trim() || isLoading}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
						>
							{#if isLoading}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<Send class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>

				<!-- Current Answer -->
				{#if currentAnswer}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h4 class="text-sm font-medium text-zinc-900">Answer:</h4>
							{#if showSaveButton}
								<button
									onclick={saveCurrentQA}
									disabled={isSaving}
									class="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
								>
									{#if isSaving}
										<Loader2 class="h-3 w-3 animate-spin" />
									{:else}
										<Save class="h-3 w-3" />
									{/if}
									<span>Save Q&A</span>
								</button>
							{/if}
						</div>
						<div class="bg-zinc-50 rounded-lg p-4">
							<div class="prose prose-sm prose-zinc max-w-none">
								{@html renderedCurrentAnswer}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Saved Q&As -->
			{#if savedQAs.length > 0}
				<div class="border-t border-zinc-200 p-6">
					<h3 class="text-sm font-medium text-zinc-900 mb-4">Previous Questions & Answers</h3>
					<div class="space-y-4">
						{#each savedQAs as qa}
							<div class="bg-zinc-50 rounded-lg p-4">
								<div class="flex items-start justify-between mb-2">
									<h4 class="text-sm font-medium text-zinc-900">Q: {qa.question}</h4>
									<button
										onclick={() => deleteQA(qa.id)}
										class="p-1 hover:bg-zinc-200 rounded transition-colors"
										title="Delete this Q&A"
									>
										<Trash2 class="h-3 w-3 text-zinc-500" />
									</button>
								</div>
								<div class="prose prose-sm prose-zinc max-w-none">
									{@html marked(qa.answer)}
								</div>
								<div class="mt-2 text-xs text-zinc-500">
									{new Date(qa.createdAt).toLocaleDateString()} • {qa.aiModel}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom prose styling for the drawer */
	:global(.prose-blue h1, .prose-blue h2, .prose-blue h3, .prose-blue h4, .prose-blue h5, .prose-blue h6) {
		color: #1e40af;
	}
	
	:global(.prose-blue a) {
		color: #2563eb;
	}
	
	:global(.prose-blue code) {
		background-color: #dbeafe;
		color: #1e40af;
	}
</style>
