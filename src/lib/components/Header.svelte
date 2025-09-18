<script lang="ts">
	import { Brain, Search, BookOpen, Menu, X } from 'lucide-svelte';
	import { page } from '$app/stores';
	
	let mobileMenuOpen = $state(false);
	
	const toggleMobileMenu = () => {
		mobileMenuOpen = !mobileMenuOpen;
	};
	
	const closeMobileMenu = () => {
		mobileMenuOpen = false;
	};
</script>

<header class="bg-white/95 backdrop-blur-sm border-b border-zinc-200 sticky top-0 z-50">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo and Brand -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-3 group" onclick={closeMobileMenu}>
					<div class="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-900 transition-colors duration-200">
						<Brain class="h-5 w-5 text-white" />
					</div>
					<div class="hidden sm:block">
						<h1 class="text-lg font-inter-tight font-semibold text-zinc-900 tracking-tight">Explore.fyi</h1>
						<p class="text-xs text-zinc-500 -mt-0.5 font-inter">AI-Powered Learning</p>
					</div>
				</a>
			</div>
			
			<!-- Desktop Navigation -->
			<nav class="hidden md:flex items-center space-x-1">
				<a 
					href="/" 
					class="flex items-center space-x-2 text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-md font-medium text-sm transition-colors duration-200 {$page.url.pathname === '/' ? 'text-zinc-900 bg-zinc-100' : 'hover:bg-zinc-50'}"
				>
					<Search class="h-4 w-4" />
					<span>Explore</span>
				</a>
				<a 
					href="/about" 
					class="flex items-center space-x-2 text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-md font-medium text-sm transition-colors duration-200 {$page.url.pathname.startsWith('/about') ? 'text-zinc-900 bg-zinc-100' : 'hover:bg-zinc-50'}"
				>
					<BookOpen class="h-4 w-4" />
					<span>About</span>
				</a>
			</nav>
			
			<!-- CTA Button -->
			<div class="hidden md:flex items-center space-x-4">
				<button class="btn btn-primary">
					Start Learning
				</button>
			</div>
			
			<!-- Mobile menu button -->
			<div class="md:hidden">
				<button
					type="button"
					class="text-zinc-600 hover:text-zinc-900 focus:outline-none focus:text-zinc-900 transition-colors duration-200 p-2"
					onclick={toggleMobileMenu}
					aria-label="Toggle mobile menu"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</div>
	</div>
	
	<!-- Mobile Navigation Menu -->
	{#if mobileMenuOpen}
		<div class="md:hidden border-t border-zinc-200 bg-white">
			<div class="px-4 py-3 space-y-1">
				<a 
					href="/" 
					class="flex items-center space-x-3 px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors duration-200 {$page.url.pathname === '/' ? 'text-zinc-900 bg-zinc-100' : ''}"
					onclick={closeMobileMenu}
				>
					<Search class="h-4 w-4" />
					<span class="font-medium text-sm">Explore Topics</span>
				</a>
				<a 
					href="/about" 
					class="flex items-center space-x-3 px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors duration-200 {$page.url.pathname.startsWith('/about') ? 'text-zinc-900 bg-zinc-100' : ''}"
					onclick={closeMobileMenu}
				>
					<BookOpen class="h-4 w-4" />
					<span class="font-medium text-sm">About</span>
				</a>
				<div class="pt-3 border-t border-zinc-100 mt-3">
					<button class="w-full btn btn-primary">
						Start Learning
					</button>
				</div>
			</div>
		</div>
	{/if}
</header>
