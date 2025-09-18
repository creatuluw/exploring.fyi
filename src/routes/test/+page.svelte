<!-- AI Integration Test Page -->
<script lang="ts">
	import { onMount } from 'svelte';
	
	let testResults: any = null;
	let isRunning = false;
	let currentStep = '';
	let errors: string[] = [];

	async function runAITest() {
		console.log('🧪 [TEST] Starting AI integration test...');
		isRunning = true;
		errors = [];
		testResults = null;
		
		try {
			// Test 1: Topic Analysis
			currentStep = 'Testing topic analysis...';
			console.log('📝 [TEST] Testing topic analysis...');
			
			const topicResponse = await fetch('/api/analyze-topic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topic: 'Machine Learning' }),
			});
			
			if (!topicResponse.ok) {
				throw new Error(`Topic analysis failed: ${topicResponse.status} ${topicResponse.statusText}`);
			}
			
			const topicResult = await topicResponse.json();
			
			if (!topicResult.success || !topicResult.data) {
				throw new Error('Topic analysis returned invalid data');
			}
			
			console.log('✅ [TEST] Topic analysis successful:', topicResult.data);

			// Test 2: Mind Map Creation
			currentStep = 'Testing mind map creation...';
			console.log('🗺️ [TEST] Testing mind map creation...');
			
			const { createMindMapFromBreakdown } = await import('$lib/services/topicAnalysis.js');
			const mindMap = createMindMapFromBreakdown(topicResult.data);
			
			if (!mindMap || !mindMap.nodes || !mindMap.edges) {
				throw new Error('Mind map creation failed');
			}
			
			console.log('✅ [TEST] Mind map creation successful:', {
				nodeCount: mindMap.nodes.length,
				edgeCount: mindMap.edges.length
			});

			// Test 3: Concept Expansion
			currentStep = 'Testing concept expansion...';
			console.log('🔍 [TEST] Testing concept expansion...');
			
			const firstConcept = topicResult.data.keyAspects[0];
			const expansionResponse = await fetch('/api/expand-concept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					concept: firstConcept.name, 
					parentTopic: 'Machine Learning' 
				}),
			});
			
			if (!expansionResponse.ok) {
				throw new Error(`Concept expansion failed: ${expansionResponse.status} ${expansionResponse.statusText}`);
			}
			
			const expansionResult = await expansionResponse.json();
			
			if (!expansionResult.success || !expansionResult.data) {
				throw new Error('Concept expansion returned invalid data');
			}
			
			console.log('✅ [TEST] Concept expansion successful:', expansionResult.data);

			// Test 4: URL Analysis
			currentStep = 'Testing URL analysis...';
			console.log('🌐 [TEST] Testing URL analysis...');
			
			const urlResponse = await fetch('/api/analyze-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: 'https://docs.python.org/3/tutorial/' }),
			});
			
			if (!urlResponse.ok) {
				throw new Error(`URL analysis failed: ${urlResponse.status} ${urlResponse.statusText}`);
			}
			
			const urlResult = await urlResponse.json();
			
			if (!urlResult.success || !urlResult.data) {
				throw new Error('URL analysis returned invalid data');
			}
			
			console.log('✅ [TEST] URL analysis successful:', urlResult.data);

			// Compile results
			testResults = {
				success: true,
				topicAnalysis: {
					topic: topicResult.data.mainTopic,
					keyAspectsCount: topicResult.data.keyAspects.length,
					difficulty: topicResult.data.difficulty,
					estimatedTime: topicResult.data.estimatedTime
				},
				mindMap: {
					nodeCount: mindMap.nodes.length,
					edgeCount: mindMap.edges.length,
					hasMainNode: mindMap.nodes.some((n: any) => n.data.isMainTopic)
				},
				conceptExpansion: {
					concept: expansionResult.data.concept,
					subConceptsCount: expansionResult.data.subConcepts.length,
					applicationsCount: expansionResult.data.practicalApplications.length,
					resourcesCount: expansionResult.data.resources.length
				},
				urlAnalysis: {
					title: urlResult.data.title,
					domain: urlResult.data.domain,
					conceptsCount: urlResult.data.concepts.length,
					credibilityScore: urlResult.data.credibility.score
				}
			};
			
			currentStep = 'All tests completed successfully! ✅';
			console.log('🎉 [TEST] All tests passed successfully!');
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			errors.push(errorMessage);
			console.error('❌ [TEST] Test failed:', errorMessage);
			
			testResults = {
				success: false,
				error: errorMessage,
				step: currentStep
			};
		} finally {
			isRunning = false;
		}
	}
</script>

<svelte:head>
	<title>AI Integration Test - Explore.fyi</title>
</svelte:head>

<div class="min-h-screen bg-zinc-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-zinc-900 mb-4">AI Integration Test</h1>
			<p class="text-zinc-600">Test the complete AI pipeline for topic analysis, mind mapping, and concept expansion</p>
		</div>

		<div class="bg-white rounded-lg shadow-sm border border-zinc-200 p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold text-zinc-900">Test Suite</h2>
				<button 
					onclick={runAITest}
					disabled={isRunning}
					class="btn btn-primary"
					class:opacity-50={isRunning}
				>
					{isRunning ? 'Running Tests...' : 'Run AI Tests'}
				</button>
			</div>
			
			{#if isRunning}
				<div class="mb-4">
					<div class="flex items-center space-x-3">
						<div class="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
						<span class="text-zinc-700">{currentStep}</span>
					</div>
				</div>
			{/if}

			{#if errors.length > 0}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
					<h3 class="font-semibold text-red-900 mb-2">Errors:</h3>
					{#each errors as error}
						<p class="text-red-700 text-sm">{error}</p>
					{/each}
				</div>
			{/if}

			{#if testResults}
				<div class="border rounded-lg p-4">
					<h3 class="font-semibold text-zinc-900 mb-4">Test Results</h3>
					
					{#if testResults.success}
						<div class="space-y-4">
							<div class="flex items-center space-x-2">
								<div class="w-3 h-3 bg-green-500 rounded-full"></div>
								<span class="font-medium text-green-900">All Tests Passed ✅</span>
							</div>
							
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="bg-zinc-50 rounded-lg p-4">
									<h4 class="font-semibold text-zinc-900 mb-2">📝 Topic Analysis</h4>
									<ul class="text-sm text-zinc-700 space-y-1">
										<li>Topic: {testResults.topicAnalysis.topic}</li>
										<li>Key Aspects: {testResults.topicAnalysis.keyAspectsCount}</li>
										<li>Difficulty: {testResults.topicAnalysis.difficulty}</li>
										<li>Time: {testResults.topicAnalysis.estimatedTime}</li>
									</ul>
								</div>
								
								<div class="bg-zinc-50 rounded-lg p-4">
									<h4 class="font-semibold text-zinc-900 mb-2">🗺️ Mind Map</h4>
									<ul class="text-sm text-zinc-700 space-y-1">
										<li>Nodes: {testResults.mindMap.nodeCount}</li>
										<li>Edges: {testResults.mindMap.edgeCount}</li>
										<li>Main Node: {testResults.mindMap.hasMainNode ? '✅' : '❌'}</li>
									</ul>
								</div>
								
								<div class="bg-zinc-50 rounded-lg p-4">
									<h4 class="font-semibold text-zinc-900 mb-2">🔍 Concept Expansion</h4>
									<ul class="text-sm text-zinc-700 space-y-1">
										<li>Concept: {testResults.conceptExpansion.concept}</li>
										<li>Sub-concepts: {testResults.conceptExpansion.subConceptsCount}</li>
										<li>Applications: {testResults.conceptExpansion.applicationsCount}</li>
										<li>Resources: {testResults.conceptExpansion.resourcesCount}</li>
									</ul>
								</div>
								
								<div class="bg-zinc-50 rounded-lg p-4">
									<h4 class="font-semibold text-zinc-900 mb-2">🌐 URL Analysis</h4>
									<ul class="text-sm text-zinc-700 space-y-1">
										<li>Title: {testResults.urlAnalysis.title}</li>
										<li>Domain: {testResults.urlAnalysis.domain}</li>
										<li>Concepts: {testResults.urlAnalysis.conceptsCount}</li>
										<li>Credibility: {testResults.urlAnalysis.credibilityScore}/10</li>
									</ul>
								</div>
							</div>
						</div>
					{:else}
						<div class="space-y-2">
							<div class="flex items-center space-x-2">
								<div class="w-3 h-3 bg-red-500 rounded-full"></div>
								<span class="font-medium text-red-900">Test Failed ❌</span>
							</div>
							<p class="text-red-700">Failed at: {testResults.step}</p>
							<p class="text-red-600 text-sm">{testResults.error}</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="bg-white rounded-lg shadow-sm border border-zinc-200 p-6">
			<h3 class="text-lg font-semibold text-zinc-900 mb-4">Test Coverage</h3>
			<ul class="space-y-2 text-zinc-700">
				<li class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
					<span>Topic Analysis API endpoint</span>
				</li>
				<li class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					<span>Mind map structure generation</span>
				</li>
				<li class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-purple-500 rounded-full"></div>
					<span>Concept expansion with AI</span>
				</li>
				<li class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-orange-500 rounded-full"></div>
					<span>URL content analysis</span>
				</li>
				<li class="flex items-center space-x-2">
					<div class="w-2 h-2 bg-red-500 rounded-full"></div>
					<span>Error handling and validation</span>
				</li>
			</ul>
		</div>
	</div>
</div>

