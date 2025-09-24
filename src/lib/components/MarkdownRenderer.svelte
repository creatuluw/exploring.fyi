<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';
	import { onMount } from 'svelte';
	import '@sukka/markdown.css';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	// Configure marked for better rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
	});

	let renderedContent = $state('');

	$effect(() => {
		if (content) {
			const renderContent = async () => {
				try {
					const htmlContent = await marked.parse(content);
					renderedContent = DOMPurify.sanitize(htmlContent);
				} catch (error: unknown) {
					console.error('Error rendering markdown:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					renderedContent = `<p class="text-red-600">Error rendering content: ${errorMessage}</p>`;
				}
			};
			renderContent();
		}
	});

	onMount(() => {
		// Initialize syntax highlighting if available
		if (typeof window !== 'undefined' && 'Prism' in window) {
			(window as any).Prism?.highlightAll();
		}
	});
</script>

<div class="markdown-body {className}">
	{@html renderedContent}
</div>

<style>
	/* Customize markdown.css to match our design guide */
	:global(.markdown-body) {
		/* Override font family to match our design system */
		font-family: var(--font-inter);
		color: var(--color-zinc-600);
		line-height: 1.625;
	}

	/* Header customizations */
	:global(.markdown-body h1),
	:global(.markdown-body h2),
	:global(.markdown-body h3),
	:global(.markdown-body h4),
	:global(.markdown-body h5),
	:global(.markdown-body h6) {
		font-family: var(--font-inter-tight);
		color: var(--color-zinc-900);
		font-weight: 700;
		letter-spacing: -0.017em;
	}

	/* Link styling to match design guide */
	:global(.markdown-body a) {
		color: var(--color-blue-600);
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: var(--color-blue-300);
		transition: all 200ms ease;
	}

	:global(.markdown-body a:hover) {
		color: var(--color-blue-800);
		text-decoration-color: var(--color-blue-500);
	}

	/* Code styling */
	:global(.markdown-body code) {
		background-color: var(--color-zinc-100);
		color: var(--color-zinc-800);
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
	}

	:global(.markdown-body pre) {
		background-color: var(--color-zinc-900);
		border-radius: 0.5rem;
	}

	:global(.markdown-body pre code) {
		background-color: transparent;
		color: var(--color-zinc-100);
	}

	/* Blockquote styling */
	:global(.markdown-body blockquote) {
		border-left-color: var(--color-zinc-300);
		color: var(--color-zinc-600);
		background-color: var(--color-zinc-50);
		padding: 1rem;
		border-radius: 0 0.5rem 0.5rem 0;
	}

	/* Table styling */
	:global(.markdown-body table th) {
		background-color: var(--color-zinc-50);
		color: var(--color-zinc-900);
		border-color: var(--color-zinc-200);
	}

	:global(.markdown-body table td) {
		border-color: var(--color-zinc-200);
		color: var(--color-zinc-700);
	}

	:global(.markdown-body table tr:nth-child(2n)) {
		background-color: var(--color-zinc-50);
	}

	:global(.markdown-body table tr:hover) {
		background-color: var(--color-zinc-100);
		transition: background-color 150ms ease;
	}

	/* Enhanced image styling */
	:global(.markdown-body img) {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
		margin: 1.5rem auto;
		display: block;
	}

	/* Horizontal rule styling */
	:global(.markdown-body hr) {
		background: linear-gradient(to right, transparent, var(--color-zinc-300), transparent);
		border: none;
		height: 1px;
		margin: 2rem 0;
	}

	/* Keyboard shortcut styling */
	:global(.markdown-body kbd) {
		background-color: var(--color-zinc-100);
		border: 1px solid var(--color-zinc-300);
		color: var(--color-zinc-700);
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
	}

	/* Task list styling */
	:global(.markdown-body input[type="checkbox"]) {
		accent-color: var(--color-blue-500);
	}

	/* Focus states for accessibility */
	:global(.markdown-body a:focus) {
		outline: 2px solid var(--color-blue-500);
		outline-offset: 2px;
	}

	/* Print styles */
	@media print {
		:global(.markdown-body a::after) {
			content: " (" attr(href) ")";
			font-size: 0.75rem;
			color: var(--color-gray-600);
		}
	}
</style>
