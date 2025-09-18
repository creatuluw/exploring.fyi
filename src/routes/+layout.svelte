<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
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
						© 2025 Explore.fyi. Transforming curiosity into knowledge.
					</p>
				</div>
				<div class="flex items-center space-x-6 text-sm text-zinc-500 font-inter">
					<a href="/privacy" class="hover:text-zinc-900 transition-colors duration-200">Privacy</a>
					<a href="/terms" class="hover:text-zinc-900 transition-colors duration-200">Terms</a>
					<a href="/contact" class="hover:text-zinc-900 transition-colors duration-200">Contact</a>
				</div>
			</div>
		</div>
	</footer>
</div>
