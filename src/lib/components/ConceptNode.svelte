<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import { Lightbulb, Plus, ChevronRight, Bookmark, MessageSquare } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import { emitNodeEvent } from '$lib/stores/mindMapEvents';
	
	interface NodeData {
		label: string;
		description?: string;
		level: number;
		expandable?: boolean;
		expanded?: boolean;
		parentId?: string;
		category?: string;
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
	
	// Get color scheme based on level
	const getColorScheme = (level: number) => {
		const schemes = [
			{ name: 'blue', bg: 'theme(colors.blue.50)', border: 'theme(colors.blue.200)', icon: 'theme(colors.blue.600)', iconBg: 'theme(colors.blue.100)' },
			{ name: 'green', bg: 'theme(colors.green.50)', border: 'theme(colors.green.200)', icon: 'theme(colors.green.600)', iconBg: 'theme(colors.green.100)' },
			{ name: 'purple', bg: 'theme(colors.purple.50)', border: 'theme(colors.purple.200)', icon: 'theme(colors.purple.600)', iconBg: 'theme(colors.purple.100)' },
			{ name: 'orange', bg: 'theme(colors.orange.50)', border: 'theme(colors.orange.200)', icon: 'theme(colors.orange.600)', iconBg: 'theme(colors.orange.100)' }
		];
		return schemes[level % schemes.length];
	};
	
	const colorScheme = $derived(getColorScheme(data.level));
	
	// Node styling based on level and state
	const nodeClass = $derived(`
		concept-node
		level-${colorScheme.name}
		${selected ? 'selected' : ''}
		${dragging ? 'dragging' : ''}
	`.trim());
</script>

<div class={nodeClass}>
	<!-- Connection handles -->
	<Handle type="target" position={Position.Top} id="target-top" class="handle handle-target" />
	<Handle type="target" position={Position.Bottom} id="target-bottom" class="handle handle-target" />
	<Handle type="target" position={Position.Left} id="target-left" class="handle handle-target" />
	<Handle type="target" position={Position.Right} id="target-right" class="handle handle-target" />
	<Handle type="source" position={Position.Top} id="top" class="handle handle-source" />
	<Handle type="source" position={Position.Bottom} id="bottom" class="handle handle-source" />
	<Handle type="source" position={Position.Left} id="left" class="handle handle-source" />
	<Handle type="source" position={Position.Right} id="right" class="handle handle-source" />
	
	<!-- Node content -->
	<div 
		class="node-content" 
		onclick={handleNodeClick}
		onkeydown={(e) => e.key === 'Enter' && handleNodeClick(e as unknown as MouseEvent)}
		role="button"
		tabindex="0"
	>
		<!-- Header -->
		<div class="node-header">
			<div class="icon-container icon-{colorScheme.name}">
				<Lightbulb class="h-4 w-4" />
			</div>
			
			<div class="title-container">
				<h4 class="node-title">{data.label}</h4>
				<!-- Description hidden - shown in details panel instead -->
			</div>
			
			<!-- Action buttons -->
			<div class="actions">
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
						title="Learn more"
					>
						<ChevronRight class="h-3 w-3" />
					</button>
				</div>
			</div>
		</div>
		
		<!-- Category indicator -->
		{#if data.category}
			<div class="category-indicator">
				<Bookmark class="h-3 w-3" />
				<span class="category-text">{data.category}</span>
			</div>
		{/if}
		
		<!-- Expansion indicator -->
		{#if data.expanded}
			<div class="expanded-indicator">
				<div class="expanded-dot dot-{colorScheme.name}"></div>
				<span class="expanded-text">Expanded</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.concept-node {
		border: 1px solid;
		border-radius: var(--radius-lg);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition: all var(--duration-normal) var(--ease-out);
		min-width: 12rem;
		max-width: 16rem;
	}
	
	.concept-node.level-blue {
		background-color: #eff6ff;
		border-color: #bfdbfe;
	}
	
	.concept-node.level-green {
		background-color: #f0fdf4;
		border-color: #bbf7d0;
	}
	
	.concept-node.level-purple {
		background-color: #faf5ff;
		border-color: #d8b4fe;
	}
	
	.concept-node.level-orange {
		background-color: #fff7ed;
		border-color: #fed7aa;
	}
	
	.concept-node:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
		transform: scale(1.02);
	}
	
	.concept-node.selected {
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		outline: 2px solid #18181b;
		outline-offset: 2px;
	}
	
	.concept-node.dragging {
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		transform: scale(1.05);
	}
	
	.node-content {
		padding: calc(var(--spacing) * 2.5);
		cursor: pointer;
	}
	
	.node-header {
		display: flex;
		align-items: flex-start;
		gap: calc(var(--spacing) * 3);
	}
	
	.icon-container {
		padding: calc(var(--spacing) * 1.5);
		border-radius: var(--radius-md);
		flex-shrink: 0;
	}
	
	.icon-blue {
		background-color: #dbeafe;
		color: #2563eb;
	}
	
	.icon-green {
		background-color: #dcfce7;
		color: #16a34a;
	}
	
	.icon-purple {
		background-color: #f3e8ff;
		color: #9333ea;
	}
	
	.icon-orange {
		background-color: #ffedd5;
		color: #ea580c;
	}
	
	.title-container {
		flex: 1;
		min-width: 0;
	}
	
	.node-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: #18181b;
		line-height: 1.25;
		margin-bottom: calc(var(--spacing) * 0.5);
	}
	
	.node-description {
		font-size: var(--text-xs);
		color: #52525b;
		line-height: 1.5;
	}
	
	.actions {
		display: flex;
		gap: calc(var(--spacing) * 1);
		flex-shrink: 0;
	}

	.action-buttons {
		display: flex;
		gap: calc(var(--spacing) * 0.5);
		align-items: center;
	}
	
	.action-btn {
		padding: calc(var(--spacing) * 1);
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
	
	.category-indicator {
		display: flex;
		align-items: center;
		gap: calc(var(--spacing) * 1.5);
		margin-top: calc(var(--spacing) * 2);
		padding-top: calc(var(--spacing) * 2);
		border-top: 1px solid currentColor;
		opacity: 0.2;
	}
	
	.category-text {
		font-size: var(--text-xs);
		color: #52525b;
		font-weight: 500;
	}
	
	.expanded-indicator {
		display: flex;
		align-items: center;
		gap: calc(var(--spacing) * 2);
		margin-top: calc(var(--spacing) * 2);
		padding-top: calc(var(--spacing) * 2);
		border-top: 1px solid currentColor;
		opacity: 0.2;
	}
	
	.expanded-dot {
		width: calc(var(--spacing) * 1.5);
		height: calc(var(--spacing) * 1.5);
		border-radius: 50%;
	}
	
	.dot-blue {
		background-color: #2563eb;
	}
	
	.dot-green {
		background-color: #16a34a;
	}
	
	.dot-purple {
		background-color: #9333ea;
	}
	
	.dot-orange {
		background-color: #ea580c;
	}
	
	.expanded-text {
		font-size: var(--text-xs);
		color: #71717a;
		font-weight: 500;
	}
	
	/* Handle styles - hidden by default */
	:global(.concept-node .handle) {
		width: calc(var(--spacing) * 2.5);
		height: calc(var(--spacing) * 2.5);
		background-color: #a1a1aa;
		border: 1px solid #ffffff;
		opacity: 0;
		transition: opacity var(--duration-normal) var(--ease-out);
	}
	
	/* Only show handles when connecting or on hover if needed */
	:global(.concept-node:hover .handle) {
		opacity: 0;
	}
	
	:global(.concept-node .handle-target) {
		background-color: #3b82f6;
	}
	
	:global(.concept-node .handle-source) {
		background-color: #22c55e;
	}
</style>
