<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import { Brain, ExternalLink, Plus, ChevronRight, MessageSquare, Loader2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { emitNodeEvent } from '$lib/stores/mindMapEvents';
	
	interface NodeData {
		label: string;
		description?: string;
		level: number;
		expandable?: boolean;
		expanded?: boolean;
		isMainTopic?: boolean;
		sourceUrl?: string;
		isLoading?: boolean;
		error?: boolean;
	}
	
	interface Props {
		id: string;
		data: NodeData;
		selected?: boolean;
		dragging?: boolean;
	}
	
	let { id, data, selected = false, dragging = false }: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	const handleNodeClick = (event: MouseEvent) => {
		event.stopPropagation();
		dispatch('nodeclick', { node: { id, data } });
	};
	
	const handleExpandClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (data.expandable && !data.expanded) {
			dispatch('nodeexpand', { node: { id, data } });
		}
	};

	const handleChatClick = (event: MouseEvent) => {
		event.stopPropagation();
		emitNodeEvent({
			type: 'openChat',
			nodeId: id,
			nodeData: data
		});
	};

	const handleDetailsClick = (event: MouseEvent) => {
		event.stopPropagation();
		emitNodeEvent({
			type: 'openDetails',
			nodeId: id,
			nodeData: data
		});
	};
	
	const handleSourceClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (data.sourceUrl) {
			window.open(data.sourceUrl, '_blank');
		}
	};
	
	// Node styling based on level and state
	const nodeClass = $derived(`
		topic-node
		${data.isMainTopic ? 'main-topic' : ''}
		${selected ? 'selected' : ''}
		${dragging ? 'dragging' : ''}
		${data.isLoading ? 'loading' : ''}
		${data.error ? 'error' : ''}
		level-${Math.min(data.level, 3)}
	`.trim());
</script>

<div class={nodeClass}>
	<!-- Connection handles - all sides for flexible connections -->
	<Handle type="source" position={Position.Top} id="top" class="handle handle-source" />
	<Handle type="source" position={Position.Bottom} id="bottom" class="handle handle-source" />
	<Handle type="source" position={Position.Left} id="left" class="handle handle-source" />
	<Handle type="source" position={Position.Right} id="right" class="handle handle-source" />
	<Handle type="target" position={Position.Top} id="target-top" class="handle handle-target" />
	<Handle type="target" position={Position.Bottom} id="target-bottom" class="handle handle-target" />
	<Handle type="target" position={Position.Left} id="target-left" class="handle handle-target" />
	<Handle type="target" position={Position.Right} id="target-right" class="handle handle-target" />
	
	<!-- Node content -->
	<div 
		class="node-content" 
		onclick={handleNodeClick}
		onkeydown={(e) => e.key === 'Enter' && handleNodeClick(e as unknown as MouseEvent)}
		role="button"
		tabindex="0"
	>
		<!-- Header with icon and title -->
		<div class="node-header">
			<div class="icon-container">
				{#if data.isLoading}
					<Loader2 class="h-4 w-4 text-white animate-spin" />
				{:else if data.isMainTopic}
					<Brain class="h-5 w-5 text-white" />
				{:else}
					<div class="level-indicator"></div>
				{/if}
			</div>
			
			<div class="title-container">
				<h3 class="node-title">{data.label}</h3>
				<!-- Description hidden - shown in details panel instead -->
			</div>
			
			<!-- Action buttons -->
			<div class="actions">
				{#if data.sourceUrl}
					<button 
						onclick={handleSourceClick}
						class="action-btn source-btn"
						title="View source"
					>
						<ExternalLink class="h-3 w-3" />
					</button>
				{/if}
				
				<div class="action-buttons">
					{#if data.expandable && !data.expanded}
						<button 
							onclick={handleExpandClick}
							class="action-btn expand-btn"
							title="Expand concept"
						>
							<Plus class="h-3 w-3" />
						</button>
					{/if}
					
					<button 
						onclick={handleChatClick}
						class="action-btn chat-btn"
						title="Start learning chat"
					>
						<MessageSquare class="h-3 w-3" />
					</button>

					<button 
						onclick={handleDetailsClick}
						class="action-btn details-btn"
						title="View details"
					>
						<ChevronRight class="h-3 w-3" />
					</button>
				</div>
			</div>
		</div>
		
		<!-- Expansion indicator -->
		{#if data.expanded}
			<div class="expanded-indicator">
				<div class="expanded-dot"></div>
				<span class="expanded-text">Expanded</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.topic-node {
		background-color: #ffffff;
		border: 1px solid #e4e4e7;
		border-radius: var(--radius-lg);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition: all var(--duration-normal) var(--ease-out);
		min-width: 14rem;
		max-width: 18rem;
		/* Ensure border is fully rendered on rounded corners */
		background-clip: padding-box;
		-webkit-background-clip: padding-box;
	}
	
	.topic-node:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
		border-color: #d4d4d8;
	}
	
	.topic-node.selected {
		border-color: #18181b;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}
	
	.topic-node.dragging {
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		transform: scale(1.05);
	}
	
	.topic-node.main-topic {
		border-color: #18181b;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}
	
	.topic-node.main-topic .node-header .icon-container {
		background-color: #18181b;
	}
	
	.level-0 {
		border-color: #18181b;
	}
	
	.level-1 {
		border-color: #3f3f46;
	}
	
	.level-2 {
		border-color: #71717a;
	}
	
	.level-3 {
		border-color: #a1a1aa;
	}
	
	.node-content {
		padding: calc(var(--spacing) * 3);
		cursor: pointer;
	}
	
	.node-header {
		display: flex;
		align-items: flex-start;
		gap: calc(var(--spacing) * 3);
	}
	
	.icon-container {
		padding: calc(var(--spacing) * 2);
		background-color: #f4f4f5;
		border-radius: var(--radius-lg);
		flex-shrink: 0;
	}
	
	.level-indicator {
		width: calc(var(--spacing) * 5);
		height: calc(var(--spacing) * 5);
		background-color: #52525b;
		border-radius: var(--radius-sm);
	}
	
	.title-container {
		flex: 1;
		min-width: 0;
	}
	
	.node-title {
		font-size: var(--text-base);
		font-weight: 600;
		color: #18181b;
		line-height: 1.25;
		margin-bottom: calc(var(--spacing) * 0.5);
	}
	
	.node-description {
		font-size: var(--text-sm);
		color: #52525b;
		line-height: 1.5;
	}
	
	.actions {
		display: flex;
		flex-direction: column;
		gap: calc(var(--spacing) * 1);
		flex-shrink: 0;
	}

	.action-buttons {
		display: flex;
		gap: calc(var(--spacing) * 1);
		align-items: center;
	}
	
	.action-btn {
		padding: calc(var(--spacing) * 1.5);
		border-radius: var(--radius-md);
		transition: all var(--duration-normal) var(--ease-out);
		opacity: 0.6;
		border: none;
		background: none;
		cursor: pointer;
	}
	
	.action-btn:hover {
		opacity: 1;
	}
	
	.source-btn {
		color: #2563eb;
	}
	
	.source-btn:hover {
		background-color: #eff6ff;
	}
	
	.expand-btn {
		color: #16a34a;
	}
	
	.expand-btn:hover {
		background-color: #f0fdf4;
	}

	.chat-btn {
		color: #7c3aed;
	}

	.chat-btn:hover {
		background-color: #f3e8ff;
	}
	
	.details-btn {
		color: #52525b;
	}
	
	.details-btn:hover {
		background-color: #fafafa;
	}
	
	.expanded-indicator {
		display: flex;
		align-items: center;
		gap: calc(var(--spacing) * 2);
		margin-top: calc(var(--spacing) * 3);
		padding-top: calc(var(--spacing) * 3);
		border-top: 1px solid #f4f4f5;
	}
	
	.expanded-dot {
		width: calc(var(--spacing) * 2);
		height: calc(var(--spacing) * 2);
		background-color: #22c55e;
		border-radius: 50%;
	}
	
	.expanded-text {
		font-size: var(--text-xs);
		color: #71717a;
		font-weight: 500;
	}
	
	/* Handle styles - hidden by default */
	:global(.topic-node .handle) {
		width: calc(var(--spacing) * 3);
		height: calc(var(--spacing) * 3);
		background-color: #a1a1aa;
		border: 2px solid #ffffff;
		opacity: 0;
		transition: opacity var(--duration-normal) var(--ease-out);
	}
	
	/* Only show handles when connecting or on hover if needed */
	:global(.topic-node:hover .handle) {
		opacity: 0;
	}
	
	:global(.topic-node .handle-target) {
		background-color: #3b82f6;
	}
	
	:global(.topic-node .handle-source) {
		background-color: #22c55e;
	}

	/* Loading state styles */
	.topic-node.loading {
		border-color: #18181b;
		border-style: solid;
		border-width: 1px;
		animation: loading-pulse 2s ease-in-out infinite;
		/* Ensure border is fully rendered on rounded corners */
		background-clip: padding-box;
		-webkit-background-clip: padding-box;
		/* Additional outline for better rounded corner visibility */
		outline: 1px solid #18181b;
		outline-offset: -1px;
	}

	.topic-node.loading .node-content {
		background: linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%);
	}

	@keyframes loading-pulse {
		0%, 100% {
			border-color: #18181b;
			outline-color: #18181b;
			box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		}
		50% {
			border-color: #18181b;
			outline-color: #18181b;
			box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(24, 24, 27, 0.1);
		}
	}

	/* Error state styles */
	.topic-node.error {
		border-color: #ef4444;
		background-color: #fef2f2;
	}

	.topic-node.error .node-content {
		background-color: #fef2f2;
	}

	.topic-node.error .icon-container {
		background: linear-gradient(135deg, #ef4444, #dc2626);
	}
</style>
