<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { 
		Brain, 
		Lightbulb, 
		Clock, 
		BarChart3, 
		Users, 
		ExternalLink,
		BookOpen,
		Target,
		Zap,
		X
	} from 'lucide-svelte';

	interface NodeData {
		label: string;
		description?: string;
		level: number;
		isMainTopic?: boolean;
		difficulty?: string;
		estimatedTime?: string;
		importance?: string;
		category?: string;
		connections?: string[];
		parentTopic?: string;
		subConcepts?: Array<{
			name: string;
			description: string;
		}>;
		sources?: Array<{
			title: string;
			url: string;
			type: string;
		}>;
	}

	interface Props {
		open?: boolean;
		nodeData?: NodeData | null;
		onclose?: () => void;
		onstartchat?: (event: CustomEvent) => void;
		onexploremore?: (event: CustomEvent) => void;
		onnavigate?: (event: CustomEvent) => void;
	}

	let { 
		open = false, 
		nodeData = null,
		onclose,
		onstartchat,
		onexploremore,
		onnavigate
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const handleClose = () => {
		if (onclose) {
			onclose();
		} else {
			dispatch('close');
		}
	};

	const handleStartChat = () => {
		if (onstartchat) {
			onstartchat(new CustomEvent('startchat', { detail: { topic: nodeData?.label } }));
		} else {
			dispatch('startChat', { topic: nodeData?.label });
		}
	};

	const handleExploreMore = () => {
		if (onexploremore) {
			onexploremore(new CustomEvent('exploremore', { detail: { nodeData } }));
		} else {
			dispatch('exploreMore', { nodeData });
		}
	};

	// Get appropriate icon for node type
	const getNodeIcon = (data: NodeData) => {
		if (data.isMainTopic) return Brain;
		return Lightbulb;
	};

	// Get difficulty color
	const getDifficultyColor = (difficulty?: string) => {
		switch (difficulty?.toLowerCase()) {
			case 'beginner': return 'text-green-600 bg-green-100';
			case 'intermediate': return 'text-yellow-600 bg-yellow-100';
			case 'advanced': return 'text-red-600 bg-red-100';
			default: return 'text-gray-600 bg-gray-100';
		}
	};

	// Get importance color
	const getImportanceColor = (importance?: string) => {
		switch (importance?.toLowerCase()) {
			case 'high': return 'text-red-600 bg-red-100';
			case 'medium': return 'text-yellow-600 bg-yellow-100';
			case 'low': return 'text-gray-600 bg-gray-100';
			default: return 'text-blue-600 bg-blue-100';
		}
	};
</script>

{#if open && nodeData}
	<div class="h-full flex flex-col bg-white">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-zinc-200">
			<div class="flex-1">
				<h2 class="text-lg font-semibold text-zinc-900 truncate">
					{nodeData.label}
				</h2>
				{#if nodeData.description}
					<p class="text-sm text-zinc-500 mt-1">
						{nodeData.description}
					</p>
				{/if}
			</div>
			<button
				type="button"
				class="p-2 text-zinc-400 hover:text-zinc-600 transition-colors rounded-lg hover:bg-zinc-100"
				onclick={handleClose}
				title="Close details"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4">
			<div class="space-y-6">
				<!-- Header with icon and basic info -->
				<div class="flex items-start gap-4 p-4 bg-zinc-50 rounded-lg">
					{#if nodeData}
						{@const IconComponent = getNodeIcon(nodeData)}
						<div class="p-3 bg-white rounded-lg shadow-sm">
							<IconComponent class="w-6 h-6 text-blue-600" />
						</div>
					{/if}
					<div class="flex-1">
						<h3 class="text-xl font-semibold text-zinc-900">
							{nodeData.label}
						</h3>
						{#if nodeData.description}
							<p class="text-zinc-600 mt-1">
								{nodeData.description}
							</p>
						{/if}
						<div class="flex items-center gap-3 mt-3 flex-wrap">
							{#if nodeData.difficulty}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getDifficultyColor(nodeData.difficulty)}">
									<BarChart3 class="w-3 h-3 mr-1" />
									{nodeData.difficulty}
								</span>
							{/if}
							{#if nodeData.importance}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getImportanceColor(nodeData.importance)}">
									<Target class="w-3 h-3 mr-1" />
									{nodeData.importance} priority
								</span>
							{/if}
							{#if nodeData.estimatedTime}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
									<Clock class="w-3 h-3 mr-1" />
									{nodeData.estimatedTime}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Sub-concepts preview -->
				{#if nodeData.subConcepts && nodeData.subConcepts.length > 0}
					<div>
						<h4 class="text-lg font-medium text-zinc-900 mb-3 flex items-center">
							<Zap class="w-5 h-5 mr-2" />
							Key Concepts
						</h4>
						<div class="space-y-3">
							{#each nodeData.subConcepts.slice(0, 4) as concept}
								<div class="p-3 border border-zinc-200 rounded-lg">
									<h5 class="font-medium text-zinc-900">
										{concept.name}
									</h5>
									<p class="text-sm text-zinc-600 mt-1">
										{concept.description}
									</p>
								</div>
							{/each}
							{#if nodeData.subConcepts.length > 4}
								<p class="text-sm text-zinc-500 text-center">
									And {nodeData.subConcepts.length - 4} more concepts...
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Connections -->
				{#if nodeData.connections && nodeData.connections.length > 0}
					<div>
						<h4 class="text-lg font-medium text-zinc-900 mb-3 flex items-center">
							<Users class="w-5 h-5 mr-2" />
							Related Topics
						</h4>
						<div class="flex flex-wrap gap-2">
							{#each nodeData.connections as connection}
								<button 
									type="button"
									class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
									onclick={() => dispatch('navigate', { topic: connection })}
								>
									{connection}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Sources -->
				{#if nodeData.sources && nodeData.sources.length > 0}
					<div>
						<h4 class="text-lg font-medium text-zinc-900 mb-3 flex items-center">
							<BookOpen class="w-5 h-5 mr-2" />
							Sources & References
						</h4>
						<div class="space-y-2">
							{#each nodeData.sources as source}
								<a 
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors group"
								>
									<div class="flex-1">
										<h5 class="font-medium text-zinc-900 group-hover:text-blue-600">
											{source.title}
										</h5>
										<p class="text-sm text-zinc-500">
											{source.type}
										</p>
									</div>
									<ExternalLink class="w-4 h-4 text-zinc-400 group-hover:text-blue-600" />
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Learning suggestions -->
				<div class="p-4 bg-blue-50 rounded-lg">
					<h4 class="text-lg font-medium text-blue-900 mb-2">
						Ready to Learn More?
					</h4>
					<p class="text-blue-700 text-sm mb-4">
						Dive deeper into {nodeData.label} with AI-powered learning assistance.
					</p>
					<div class="flex gap-3">
						<button 
							type="button"
							class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
							onclick={handleStartChat}
						>
							Start Learning Chat
						</button>
						<button 
							type="button"
							class="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
							onclick={handleExploreMore}
						>
							Explore More
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if open}
	<div class="h-full flex items-center justify-center bg-white">
		<p class="text-zinc-500">
			Select a node to view details
		</p>
	</div>
{/if}
