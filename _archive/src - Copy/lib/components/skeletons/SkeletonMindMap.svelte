<script lang="ts">
	import SkeletonNode from './SkeletonNode.svelte';
	
	interface Props {
		nodeCount?: number;
		centerTopic?: string;
	}
	
	let { nodeCount = 5, centerTopic = 'Topic' }: Props = $props();
	
	// Generate skeleton node positions in a radial layout
	const generateSkeletonNodes = (count: number) => {
		const nodes = [];
		
		// Use percentage-based positioning for center
		const centerX = 50; // 50% of container width
		const centerY = 50; // 50% of container height
		
		// Main topic in center
		nodes.push({
			id: 'main',
			x: centerX,
			y: centerY,
			isMain: true,
			width: 240,
			height: 100
		});
		
		// Surrounding concept nodes
		const radiusX = 15; // 15% of container width
		const radiusY = 20; // 20% of container height
		for (let i = 0; i < count - 1; i++) {
			const angle = (i / (count - 1)) * 2 * Math.PI;
			const x = centerX + Math.cos(angle) * radiusX;
			const y = centerY + Math.sin(angle) * radiusY;
			
			nodes.push({
				id: `concept-${i}`,
				x: x,
				y: y,
				isMain: false,
				width: 200,
				height: 80
			});
		}
		
		return nodes;
	};
	
	let skeletonNodes = $derived(generateSkeletonNodes(nodeCount));
</script>

<div class="skeleton-mindmap">
	<div class="skeleton-container">
		{#each skeletonNodes as node}
			<div 
				class="skeleton-node-wrapper" 
				style="left: {node.x}%; top: {node.y}%; transform: translate(-50%, -50%);"
			>
				<SkeletonNode 
					width={node.width} 
					height={node.height} 
					isMainTopic={node.isMain}
				/>
			</div>
		{/each}
		
		<!-- Skeleton edges -->
		{#each skeletonNodes.slice(1) as node, i}
			<div 
				class="skeleton-edge"
				style="
					left: 50%; 
					top: 50%;
					width: {Math.sqrt(Math.pow(node.x - 50, 2) + Math.pow(node.y - 50, 2)) * 3}%;
					transform: translate(-50%, -50%) rotate({Math.atan2(node.y - 50, node.x - 50)}rad);
					animation-delay: {i * 0.2}s;
				"
			></div>
		{/each}
	</div>
	
	<!-- Loading indicator -->
	<div class="skeleton-loading">
		<div class="loading-spinner"></div>
		<p class="loading-text">Analyzing "{centerTopic}"...</p>
		<p class="loading-subtext">Building mind map structure</p>
	</div>
</div>

<style>
	.skeleton-mindmap {
		width: 100%;
		height: 100%;
		position: relative;
		background: #f9fafb;
		overflow: hidden;
	}
	
	.skeleton-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
	
	.skeleton-node-wrapper {
		position: absolute;
		animation: fadeInSkeleton 0.5s ease-out;
	}
	
	.skeleton-edge {
		position: absolute;
		height: 2px;
		background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite, fadeInSkeleton 0.5s ease-out;
		transform-origin: center left;
		opacity: 0.6;
	}
	
	.skeleton-loading {
		position: absolute;
		top: 50px;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		z-index: 10;
	}
	
	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 12px;
	}
	
	.loading-text {
		font-size: 16px;
		font-weight: 600;
		color: #374151;
		margin: 0 0 4px 0;
	}
	
	.loading-subtext {
		font-size: 14px;
		color: #6b7280;
		margin: 0;
	}
	
	@keyframes fadeInSkeleton {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
