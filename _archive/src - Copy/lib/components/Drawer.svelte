<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		position?: 'right' | 'left' | 'bottom' | 'top';
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		title?: string;
		subtitle?: string;
		showCloseButton?: boolean;
		backdrop?: boolean;
		overlayClass?: string;
		contentClass?: string;
		onclose?: () => void;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let {
		open = false,
		position = 'right',
		size = 'md',
		title = '',
		subtitle = '',
		showCloseButton = true,
		backdrop = true,
		overlayClass = '',
		contentClass = '',
		onclose,
		children,
		footer
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const handleClose = () => {
		if (onclose) {
			onclose();
		} else {
			dispatch('close');
		}
	};

	const handleBackdropClick = (event: MouseEvent) => {
		if (backdrop && event.target === event.currentTarget) {
			handleClose();
		}
	};

	// Determine transform classes based on position
	const getTransformClasses = (position: string, open: boolean) => {
		const transforms = {
			right: open ? 'translate-x-0' : 'translate-x-full',
			left: open ? 'translate-x-0' : '-translate-x-full',
			bottom: open ? 'translate-y-0' : 'translate-y-full',
			top: open ? 'translate-y-0' : '-translate-y-full'
		};
		return transforms[position as keyof typeof transforms] || transforms.right;
	};

	// Determine size classes
	const getSizeClasses = (position: string, size: string) => {
		const isVertical = position === 'top' || position === 'bottom';
		
		if (size === 'full') {
			return isVertical ? 'w-full h-full' : 'w-full h-full';
		}

		const sizes = {
			sm: isVertical ? 'w-full h-64' : 'w-80 h-full',
			md: isVertical ? 'w-full h-96' : 'w-96 h-full',
			lg: isVertical ? 'w-full h-1/2' : 'w-1/3 h-full',
			xl: isVertical ? 'w-full h-2/3' : 'w-1/2 h-full'
		};

		return sizes[size as keyof typeof sizes] || sizes.md;
	};

	// Determine positioning classes
	const getPositionClasses = (position: string) => {
		const positions = {
			right: 'right-0 top-0',
			left: 'left-0 top-0',
			bottom: 'bottom-0 left-0',
			top: 'top-0 left-0'
		};
		return positions[position as keyof typeof positions] || positions.right;
	};

	const transformClass = $derived(getTransformClasses(position, open));
	const sizeClass = $derived(getSizeClasses(position, size));
	const positionClass = $derived(getPositionClasses(position));
</script>

<!-- Backdrop -->
{#if backdrop && open}
	<div 
		class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="presentation"
		tabindex="-1"
	></div>
{/if}

<!-- Drawer -->
<div 
	class="fixed z-50 bg-white dark:bg-gray-900 shadow-xl transition-transform duration-300 ease-in-out {positionClass} {sizeClass} {transformClass} {overlayClass}"
	role="dialog"
	aria-modal="true"
	aria-labelledby={title ? 'drawer-title' : undefined}
>
	<!-- Header -->
	{#if title || showCloseButton}
		<div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
			<div class="flex-1">
				{#if title}
					<h2 id="drawer-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{title}
					</h2>
				{/if}
				{#if subtitle}
					<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{subtitle}
					</p>
				{/if}
			</div>

			{#if showCloseButton}
				<button
					type="button"
					class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
					onclick={handleClose}
					aria-label="Close drawer"
				>
					<X class="w-5 h-5" />
				</button>
			{/if}
		</div>
	{/if}

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-4 {contentClass}">
		{#if children}
			{@render children()}
		{/if}
	</div>

	<!-- Footer -->
	{#if footer}
		<div class="border-t border-gray-200 dark:border-gray-700 p-4">
			{@render footer()}
		</div>
	{/if}
</div>

<style>
	/* Ensure drawer appears above other content */
	:global(body.drawer-open) {
		overflow: hidden;
	}
</style>
