<script lang="ts">
	import { Brain, Zap, Users, BookOpen, ArrowRight, Star, Sparkles } from 'lucide-svelte';
</script>

<svelte:head>
	<title>About - Explore.fyi</title>
	<meta name="description" content="Learn about Explore.fyi - AI-powered learning platform that transforms how you discover and understand new topics through interactive mind maps and personalized content." />
</svelte:head>

<!-- Hero Section -->
<section class="relative bg-gradient-to-b from-zinc-50 to-white pt-16 pb-8 lg:pt-20 lg:pb-12">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center space-y-8">
			<!-- Hero Headline -->
			<div class="space-y-6">
				<h1 class="h1">
					About
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900">
						Explore.fyi
					</span>
				</h1>
				<p class="text-lead max-w-3xl mx-auto">
					Transforming how you learn and explore new topics through AI-powered insights, 
					interactive mind maps, and personalized learning journeys.
				</p>
			</div>
			
			<!-- Social Proof -->
			<div class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-zinc-500">
				<div class="flex items-center space-x-2">
					<Users class="h-4 w-4" />
					<span class="text-sm font-inter">Trusted by 10,000+ learners</span>
				</div>
				<div class="flex items-center space-x-1">
					{#each Array(5) as _}
						<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
					{/each}
					<span class="text-sm font-inter ml-2">4.9/5 rating</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Mission Section -->
<section class="pt-8 pb-20 bg-white">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="bg-zinc-50 border border-zinc-200 rounded-xl p-8 lg:p-12">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
				<div>
					<h2 class="h2 mb-6">
						Our Mission
					</h2>
					<p class="text-body mb-6">
						We believe learning should be <strong>intuitive, engaging, and accessible</strong> to everyone. 
						Traditional learning methods often overwhelm with information without providing clear connections 
						and context.
					</p>
					<p class="text-body mb-8">
						Explore.fyi bridges this gap by using AI to instantly generate comprehensive, 
						visual learning materials that adapt to your curiosity and learning style.
					</p>
					<div class="flex flex-col sm:flex-row sm:items-center sm:space-x-8 space-y-3 sm:space-y-0">
						<div class="flex items-center space-x-2 text-zinc-700">
							<Zap class="h-4 w-4" />
							<span class="text-sm font-inter font-medium">Instant Understanding</span>
						</div>
						<div class="flex items-center space-x-2 text-zinc-700">
							<BookOpen class="h-4 w-4" />
							<span class="text-sm font-inter font-medium">Visual Learning</span>
						</div>
					</div>
				</div>
				<div class="bg-white border border-zinc-200 rounded-xl p-8">
					<div class="grid grid-cols-2 gap-6">
						<div class="text-center">
							<div class="text-3xl font-inter-tight font-bold text-zinc-900 mb-2">10x</div>
							<div class="text-sm text-zinc-600 font-inter">Faster Learning</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-inter-tight font-bold text-zinc-900 mb-2">∞</div>
							<div class="text-sm text-zinc-600 font-inter">Topics Available</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-inter-tight font-bold text-zinc-900 mb-2">24/7</div>
							<div class="text-sm text-zinc-600 font-inter">AI Assistant</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-inter-tight font-bold text-zinc-900 mb-2">100%</div>
							<div class="text-sm text-zinc-600 font-inter">Personalized</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-24 bg-zinc-50">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center space-y-4 mb-20">
			<h2 class="h2">
				Why Choose Explore.fyi?
			</h2>
			<p class="text-lead max-w-2xl mx-auto">
				Experience learning like never before with our AI-powered platform
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Brain class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					AI-Powered Analysis
				</h3>
				<p class="text-body">
					Our advanced AI breaks down complex topics into digestible, interconnected concepts that make learning intuitive and comprehensive.
				</p>
			</div>
			
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Sparkles class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					Interactive Mind Maps
				</h3>
				<p class="text-body">
					Visualize knowledge through dynamic, interactive mind maps that let you explore connections and dive deeper into any concept.
				</p>
			</div>
			
			<div class="card-feature">
				<div class="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-6">
					<Zap class="h-6 w-6 text-zinc-700" />
				</div>
				<h3 class="h4 mb-4">
					Instant Understanding
				</h3>
				<p class="text-body">
					Transform any topic or URL into structured knowledge in seconds. From Wikipedia articles to research papers, we make it all accessible.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Vision Section -->
<section class="pt-8 pb-20 bg-white">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="bg-zinc-50 border border-zinc-200 rounded-xl p-8 lg:p-12">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
				<div>
					<h3 class="h3 mb-4">Our Vision</h3>
					<p class="text-body mb-6">
						We envision a world where curiosity is instantly rewarded with understanding. 
						Where anyone can explore any topic and gain meaningful insights without 
						barriers of complexity, time, or access.
					</p>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-zinc-400 rounded-full"></div>
							<span class="text-zinc-700 font-inter text-sm">Making complex topics accessible</span>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-zinc-400 rounded-full"></div>
							<span class="text-zinc-700 font-inter text-sm">Empowering lifelong learners</span>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-zinc-400 rounded-full"></div>
							<span class="text-zinc-700 font-inter text-sm">Bridging knowledge gaps with AI</span>
						</div>
					</div>
				</div>
				<div class="bg-white border border-zinc-200 rounded-xl p-6">
					<div class="text-center">
						<div class="text-4xl mb-4">🚀</div>
						<h4 class="h4 mb-2">Join the Journey</h4>
						<p class="text-body text-sm mb-4">
							Be part of the learning revolution. Start exploring topics in a completely new way.
						</p>
						<a 
							href="/" 
							class="btn btn-primary inline-flex items-center space-x-2"
						>
							<span>Start Exploring</span>
							<ArrowRight class="h-4 w-4" />
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-24 bg-zinc-900">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
		<div class="space-y-8">
			<h2 class="text-4xl md:text-5xl font-inter-tight font-bold text-white tracking-tight">
				Ready to Transform How You Learn?
			</h2>
			<p class="text-lg text-zinc-300 max-w-2xl mx-auto font-inter leading-relaxed">
				Join thousands of learners who are already exploring knowledge in a whole new way.
			</p>
			<button class="bg-white hover:bg-zinc-50 text-zinc-900 font-semibold px-8 py-4 rounded-md transition-all duration-200 inline-flex items-center space-x-2 text-base shadow-lg hover:shadow-xl">
				<span>Start Exploring Now</span>
				<ArrowRight class="h-4 w-4" />
			</button>
		</div>
	</div>
</section>
