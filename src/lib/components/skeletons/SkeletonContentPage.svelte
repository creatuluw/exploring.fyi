<script lang="ts">
	interface Props {
		sectionCount?: number;
		topic?: string;
	}
	
	let { sectionCount = 4, topic = 'Topic' }: Props = $props();
	
	const skeletonSections = Array.from({ length: sectionCount }, (_, i) => ({
		id: i,
		height: 80 + Math.random() * 60 // Varying heights for realistic look
	}));
</script>

<div class="skeleton-content-page">
	<!-- Header Section -->
	<div class="skeleton-header">
		<div class="skeleton-breadcrumb"></div>
		<div class="skeleton-title"></div>
		<div class="skeleton-meta">
			<div class="skeleton-difficulty"></div>
			<div class="skeleton-time"></div>
		</div>
	</div>
	
	<!-- Objectives and Prerequisites -->
	<div class="skeleton-info-section">
		<div class="skeleton-info-block">
			<div class="skeleton-info-title"></div>
			<div class="skeleton-list-item"></div>
			<div class="skeleton-list-item"></div>
			<div class="skeleton-list-item"></div>
		</div>
		<div class="skeleton-info-block">
			<div class="skeleton-info-title"></div>
			<div class="skeleton-list-item"></div>
			<div class="skeleton-list-item"></div>
		</div>
	</div>
	
	<!-- Content Sections -->
	<div class="skeleton-content">
		{#each skeletonSections as section, i}
			<div 
				class="skeleton-section"
				style="animation-delay: {i * 0.1}s;"
			>
				<div class="skeleton-section-title"></div>
				<div class="skeleton-section-content" style="height: {section.height}px;">
					<div class="skeleton-paragraph"></div>
					<div class="skeleton-paragraph short"></div>
					<div class="skeleton-paragraph"></div>
				</div>
			</div>
		{/each}
	</div>
	
	<!-- Sidebar -->
	<div class="skeleton-sidebar">
		<div class="skeleton-sidebar-section">
			<div class="skeleton-sidebar-title"></div>
			<div class="skeleton-sidebar-item"></div>
			<div class="skeleton-sidebar-item"></div>
			<div class="skeleton-sidebar-item"></div>
		</div>
	</div>
	
	<!-- Loading indicator -->
	<div class="skeleton-loading-overlay">
		<div class="loading-content">
			<div class="loading-spinner"></div>
			<p class="loading-text">Generating content for "{topic}"</p>
			<p class="loading-subtext">Creating comprehensive learning material...</p>
		</div>
	</div>
</div>

<style>
	.skeleton-content-page {
		max-width: 6xl;
		margin: 0 auto;
		padding: 2rem;
		position: relative;
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 2rem;
		min-height: 100vh;
	}
	
	.skeleton-header {
		grid-column: 1 / -1;
		margin-bottom: 2rem;
	}
	
	.skeleton-breadcrumb {
		height: 16px;
		width: 200px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.skeleton-title {
		height: 32px;
		width: 60%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 6px;
		margin-bottom: 1rem;
	}
	
	.skeleton-meta {
		display: flex;
		gap: 1rem;
	}
	
	.skeleton-difficulty {
		height: 24px;
		width: 100px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 12px;
	}
	
	.skeleton-time {
		height: 24px;
		width: 120px;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 12px;
	}
	
	.skeleton-info-section {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}
	
	.skeleton-info-block {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}
	
	.skeleton-info-title {
		height: 20px;
		width: 40%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.skeleton-list-item {
		height: 16px;
		width: 80%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
	
	.skeleton-list-item:nth-child(3) { width: 70%; }
	.skeleton-list-item:nth-child(4) { width: 85%; }
	
	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	
	.skeleton-section {
		animation: fadeInUp 0.5s ease-out;
	}
	
	.skeleton-section-title {
		height: 24px;
		width: 50%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.skeleton-section-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.skeleton-paragraph {
		height: 14px;
		width: 100%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 3px;
	}
	
	.skeleton-paragraph.short {
		width: 75%;
	}
	
	.skeleton-sidebar {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	
	.skeleton-sidebar-section {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}
	
	.skeleton-sidebar-title {
		height: 18px;
		width: 60%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.skeleton-sidebar-item {
		height: 14px;
		width: 90%;
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 2s infinite;
		border-radius: 3px;
		margin-bottom: 0.5rem;
	}
	
	.skeleton-loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	
	.loading-content {
		text-align: center;
	}
	
	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}
	
	.loading-text {
		font-size: 18px;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}
	
	.loading-subtext {
		font-size: 14px;
		color: #6b7280;
		margin: 0;
	}
	
	@keyframes shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}
	
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	@media (max-width: 1024px) {
		.skeleton-content-page {
			grid-template-columns: 1fr;
			padding: 1rem;
		}
		
		.skeleton-info-section {
			grid-template-columns: 1fr;
		}
	}
</style>
