<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Drawer from './Drawer.svelte';
	import { 
		Send, 
		MessageSquare, 
		Bot, 
		User, 
		Loader2,
		Lightbulb,
		BookOpen
	} from 'lucide-svelte';

	interface ChatMessage {
		id: string;
		type: 'user' | 'assistant';
		content: string;
		timestamp: Date;
		topic?: string;
	}

	interface Props {
		open?: boolean;
		topic?: string;
		initialMessage?: string;
		onclose?: () => void;
	}

	let { 
		open = false, 
		topic = '',
		initialMessage = '',
		onclose
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let messages: ChatMessage[] = $state([]);
	let inputValue = $state('');
	let isLoading = $state(false);
	let chatContainer: HTMLElement;

	// Initialize chat when opened with a topic
	$effect(() => {
		if (open && topic && messages.length === 0) {
			initializeChat();
		}
	});

	const initializeChat = () => {
		const welcomeMessage: ChatMessage = {
			id: generateId(),
			type: 'assistant',
			content: initialMessage || `Hi! I'm here to help you learn about **${topic}**. What would you like to know? You can ask me about:\n\n• Key concepts and definitions\n• Real-world applications\n• How it relates to other topics\n• Learning resources and next steps`,
			timestamp: new Date(),
			topic
		};
		messages = [welcomeMessage];
	};

	const handleClose = () => {
		if (onclose) {
			onclose();
		} else {
			dispatch('close');
		}
		// Optionally clear messages when closing
		// messages = [];
	};

	const handleSendMessage = async () => {
		if (!inputValue.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: generateId(),
			type: 'user',
			content: inputValue.trim(),
			timestamp: new Date(),
			topic
		};

		messages = [...messages, userMessage];
		const currentInput = inputValue;
		inputValue = '';
		isLoading = true;

		// Scroll to bottom
		setTimeout(() => scrollToBottom(), 100);

		try {
			// Here you would call your AI service
			const response = await simulateAIResponse(currentInput, topic);
			
			const assistantMessage: ChatMessage = {
				id: generateId(),
				type: 'assistant',
				content: response,
				timestamp: new Date(),
				topic
			};

			messages = [...messages, assistantMessage];
		} catch (error) {
			console.error('Failed to get AI response:', error);
			const errorMessage: ChatMessage = {
				id: generateId(),
				type: 'assistant',
				content: "I'm sorry, I encountered an error. Please try asking your question again.",
				timestamp: new Date(),
				topic
			};
			messages = [...messages, errorMessage];
		} finally {
			isLoading = false;
			setTimeout(() => scrollToBottom(), 100);
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	};

	const scrollToBottom = () => {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	};

	const generateId = () => {
		return Math.random().toString(36).substr(2, 9);
	};

	// Simulate AI response (replace with actual AI service call)
	const simulateAIResponse = async (question: string, topic: string): Promise<string> => {
		await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
		
		const responses = [
			`Great question about ${topic}! Let me explain that concept in detail...`,
			`That's an excellent way to think about ${topic}. Here's how it works...`,
			`I can help you understand that aspect of ${topic}. Let me break it down...`,
			`That's a common question when learning about ${topic}. The key points are...`
		];
		
		return responses[Math.floor(Math.random() * responses.length)] + 
			"\n\nWould you like me to elaborate on any specific part or explain how this connects to related concepts?";
	};

	const formatTimestamp = (date: Date) => {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	// Suggested questions based on topic
	const getSuggestedQuestions = (topic: string) => [
		`What are the key principles of ${topic}?`,
		`How is ${topic} used in practice?`,
		`What should I learn next about ${topic}?`,
		`Can you give me examples of ${topic}?`
	];

	const handleSuggestedQuestion = (question: string) => {
		inputValue = question;
	};
</script>

<Drawer 
	{open} 
	position="left" 
	size="xl"
	title="Learning Assistant"
	subtitle={topic ? `Exploring: ${topic}` : 'AI-powered learning chat'}
	onclose={handleClose}
	contentClass="p-0"
>
	<div class="flex flex-col h-full">
		<!-- Chat messages -->
		<div 
			bind:this={chatContainer}
			class="flex-1 overflow-y-auto p-4 pb-6 space-y-4 min-h-0"
		>
			{#each messages as message (message.id)}
				<div class="flex items-start gap-3 {message.type === 'user' ? 'flex-row-reverse' : ''}">
					<!-- Avatar -->
					<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {message.type === 'user' ? 'bg-blue-600' : 'bg-gray-600'}">
						{#if message.type === 'user'}
							<User class="w-4 h-4 text-white" />
						{:else}
							<Bot class="w-4 h-4 text-white" />
						{/if}
					</div>

					<!-- Message bubble -->
					<div class="flex-1 max-w-3xl">
						<div class="p-3 rounded-lg {message.type === 'user' ? 'bg-blue-600 text-white ml-12' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-12'}">
							<div class="whitespace-pre-wrap text-sm leading-relaxed">
								{@html message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
							</div>
						</div>
						<div class="text-xs text-gray-500 mt-1 {message.type === 'user' ? 'text-right' : 'text-left'}">
							{formatTimestamp(message.timestamp)}
						</div>
					</div>
				</div>
			{/each}

			<!-- Loading indicator -->
			{#if isLoading}
				<div class="flex items-start gap-3">
					<div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
						<Bot class="w-4 h-4 text-white" />
					</div>
					<div class="flex-1 max-w-3xl mr-12">
						<div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
							<div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
								<Loader2 class="w-4 h-4 animate-spin" />
								<span class="text-sm">Thinking...</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Suggested questions (show when no messages yet) -->
			{#if messages.length <= 1 && topic}
				<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h4 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
						<Lightbulb class="w-4 h-4 mr-1" />
						Suggested questions:
					</h4>
					<div class="space-y-2">
						{#each getSuggestedQuestions(topic) as question}
							<button 
								type="button"
								class="block w-full text-left p-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
								onclick={() => handleSuggestedQuestion(question)}
							>
								{question}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Input area - sticky to bottom -->
		<div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
			<div class="flex gap-3">
				<div class="flex-1 relative">
					<textarea
						bind:value={inputValue}
						onkeydown={handleKeyDown}
						placeholder={topic ? `Ask me anything about ${topic}...` : 'Ask me anything...'}
						class="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						rows="1"
						style="min-height: 44px; max-height: 120px;"
						disabled={isLoading}
					></textarea>
					<button
						type="button"
						onclick={handleSendMessage}
						disabled={!inputValue.trim() || isLoading}
						class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
						aria-label="Send message"
					>
						<Send class="w-4 h-4" />
					</button>
				</div>
			</div>
			<div class="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
				<span>Press Enter to send, Shift+Enter for new line</span>
				<span class="flex items-center gap-1">
					<MessageSquare class="w-3 h-3" />
					{messages.length} messages
				</span>
			</div>
		</div>
	</div>
</Drawer>
