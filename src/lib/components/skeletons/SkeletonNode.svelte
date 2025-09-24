<script lang="ts">
	interface Props {
		width?: number;
		height?: number;
		isMainTopic?: boolean;
	}
	
	let { width = 200, height = 80, isMainTopic = false }: Props = $props();
</script>

<div 
	class="skeleton-node"
	style="width: {width}px; height: {height}px;"
	class:main-topic={isMainTopic}
>
	<div class="skeleton-content">
		<div class="skeleton-title"></div>
		<div class="skeleton-description"></div>
		{#if !isMainTopic}
			<div class="skeleton-expand-button"></div>
		{/if}
	</div>
</div>

<style>
	.skeleton-node {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 16px;
		position: relative;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	
	.skeleton-node.main-topic {
		border-color: #3b82f6;
		background: #eff6ff;
	}
	
	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		height: 100%;
	}
	
	.skeleton-title {
		height: 16px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		width: 80%;
	}
	
	.skeleton-description {
		height: 12px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		width: 60%;
		margin-top: 4px;
	}
	
	.skeleton-expand-button {
		height: 20px;
		width: 20px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 50%;
		position: absolute;
		bottom: 8px;
		right: 8px;
	}
	
	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}
</style>
