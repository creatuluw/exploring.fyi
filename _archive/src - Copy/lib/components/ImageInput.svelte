<script lang="ts">
	import { Upload, Image, Info } from 'lucide-svelte';
	
	let dragActive = $state(false);
	let selectedFile = $state<File | null>(null);
	
	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		dragActive = true;
	};
	
	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		dragActive = false;
	};
	
	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		dragActive = false;
		
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	};
	
	const handleFileInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};
	
	const handleFileSelect = (file: File) => {
		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}
		
		// Validate file size (10MB limit)
		if (file.size > 10 * 1024 * 1024) {
			alert('File size must be less than 10MB');
			return;
		}
		
		selectedFile = file;
		console.log('Selected file:', file.name);
		// TODO: Implement image analysis
	};
	
	const clearFile = () => {
		selectedFile = null;
	};
	
	const analyzeImage = () => {
		if (!selectedFile) return;
		
		// TODO: Implement image analysis and navigation to explore page
		console.log('Analyzing image:', selectedFile.name);
		alert('Image analysis coming soon! This feature is currently in development.');
	};
</script>

<div class="space-y-8">
	<!-- Upload Area -->
	<div class="space-y-4">
		<div 
			class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragActive ? 'border-blue-400 bg-blue-50' : selectedFile ? 'border-green-400 bg-green-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="button"
			tabindex="0"
			aria-label="Upload image area"
		>
			<input
				type="file"
				accept="image/*"
				onchange={handleFileInput}
				class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				id="image-upload"
			/>
			
			{#if selectedFile}
				<!-- File Selected State -->
				<div class="space-y-4">
					<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<Image class="h-8 w-8 text-green-600" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-zinc-900">{selectedFile.name}</h3>
						<p class="text-sm text-zinc-600">
							{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
						</p>
					</div>
					<div class="flex gap-3 justify-center">
						<button
							onclick={analyzeImage}
							class="btn btn-primary px-6"
						>
							Analyze Image
						</button>
						<button
							onclick={clearFile}
							class="btn btn-secondary px-6"
						>
							Choose Different Image
						</button>
					</div>
				</div>
			{:else}
				<!-- Default Upload State -->
				<div class="space-y-4">
					<div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
						<Upload class="h-8 w-8 text-zinc-500" />
					</div>
					<div>
						<h3 class="text-lg font-semibold text-zinc-900">Upload an Image to Explore</h3>
						<p class="text-zinc-600">
							Drag and drop an image here, or click to browse
						</p>
					</div>
					<p class="text-sm text-zinc-500">
						Supports PNG, JPG, JPEG • Max 10MB
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Info Section -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
		<div class="flex items-start space-x-3">
			<Info class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
			<div class="space-y-2">
				<h4 class="font-semibold text-blue-900">Coming Soon: AI-Powered Image Analysis</h4>
				<div class="text-sm text-blue-800 space-y-1">
					<p>• Extract and explore concepts from diagrams, charts, and infographics</p>
					<p>• Analyze historical documents, scientific illustrations, and educational materials</p>
					<p>• Generate interactive mind maps from visual content</p>
					<p>• Perfect for visual learners and researchers</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Examples -->
	<div class="space-y-4">
		<div class="flex items-center space-x-2 text-zinc-600">
			<Image class="h-4 w-4" />
			<span class="text-sm font-medium font-inter">Great for analyzing:</span>
		</div>
		
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="bg-white border border-zinc-200 rounded-lg p-4 text-center">
				<div class="text-xs font-medium text-zinc-700">Scientific Diagrams</div>
			</div>
			<div class="bg-white border border-zinc-200 rounded-lg p-4 text-center">
				<div class="text-xs font-medium text-zinc-700">Historical Maps</div>
			</div>
			<div class="bg-white border border-zinc-200 rounded-lg p-4 text-center">
				<div class="text-xs font-medium text-zinc-700">Infographics</div>
			</div>
			<div class="bg-white border border-zinc-200 rounded-lg p-4 text-center">
				<div class="text-xs font-medium text-zinc-700">Study Materials</div>
			</div>
		</div>
	</div>
</div>
