<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { session, isSessionReady } from '$lib/stores/session.js';
	import { interfaceLanguage } from '$lib/stores/language.js';
	import { initializeTranslations, t } from '$lib/i18n/index.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Initialize session and translations when the app loads
	onMount(async () => {
		try {
			// Initialize translations first
			await initializeTranslations();
			console.log('Translations initialized successfully');
			
			// Then initialize session
			await session.initialize();
			console.log('Session initialized successfully');
		} catch (error) {
			console.error('Failed to initialize app:', error);
		}
	});
	
	// Update document language when interface language changes
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = $interfaceLanguage;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-zinc-50 flex flex-col">
	<Header />
	
	<main class="flex-1">
		{@render children?.()}
	</main>
	
	<!-- Footer -->
	<footer class="bg-white border-t border-zinc-200 mt-auto">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
				<div class="flex items-center space-x-2">
					<p class="text-zinc-500 text-sm font-inter">
						{$t('footer.copyright')}
					</p>
				</div>
				<div class="flex items-center space-x-6 text-sm text-zinc-500 font-inter">
					<a href="/privacy" class="hover:text-zinc-900 transition-colors duration-200">{$t('footer.privacy')}</a>
					<a href="/terms" class="hover:text-zinc-900 transition-colors duration-200">{$t('footer.terms')}</a>
					<a href="/contact" class="hover:text-zinc-900 transition-colors duration-200">{$t('footer.contact')}</a>
				</div>
			</div>
		</div>
	</footer>
</div>
