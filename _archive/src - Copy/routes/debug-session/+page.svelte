<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { supabase } from '$lib/database/supabase.js';

	let sessionInfo = $state(null);
	let allSessions = $state([]);
	let allTopics = $state([]);
	let correctSessionId = '43022887-3b50-4b42-acad-9c39bcea7525'; // The session with topics

	onMount(async () => {
		// Get current session info
		sessionInfo = $session;
		
		// Get all sessions from database
		const { data: sessions } = await supabase.from('sessions').select('*');
		allSessions = sessions || [];
		
		// Get all topics
		const { data: topics } = await supabase.from('topics').select('*');
		allTopics = topics || [];
	});

	async function setCorrectSession() {
		// Set the correct session ID in localStorage
		localStorage.setItem('explore_session_id', correctSessionId);
		
		// Reinitialize the session store
		await session.initialize();
		
		// Refresh the page
		window.location.reload();
	}

	async function createNewSession() {
		// Clear localStorage and create new session
		localStorage.removeItem('explore_session_id');
		session.reset();
		await session.initialize();
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Debug Session - Explore.fyi</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-6">Session Debug Information</h1>
	
	<!-- Current Session Info -->
	<div class="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
		<h2 class="text-lg font-semibold mb-4">Current Browser Session</h2>
		{#if sessionInfo}
			<div class="space-y-2">
				<p><strong>Session ID:</strong> {sessionInfo.id || 'None'}</p>
				<p><strong>Initialized:</strong> {sessionInfo.isInitialized ? 'Yes' : 'No'}</p>
				<p><strong>Loading:</strong> {sessionInfo.isLoading ? 'Yes' : 'No'}</p>
				<p><strong>Topic Count:</strong> {sessionInfo.topicCount}</p>
				<p><strong>Last Activity:</strong> {sessionInfo.lastActivity || 'None'}</p>
				{#if sessionInfo.error}
					<p class="text-red-600"><strong>Error:</strong> {sessionInfo.error}</p>
				{/if}
			</div>
		{:else}
			<p>Loading session info...</p>
		{/if}
	</div>

	<!-- Database Sessions -->
	<div class="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
		<h2 class="text-lg font-semibold mb-4">All Sessions in Database</h2>
		{#if allSessions.length > 0}
			{#each allSessions as dbSession}
				<div class="border-l-4 {dbSession.id === correctSessionId ? 'border-green-500 bg-green-50' : 'border-zinc-300'} pl-4 py-2 mb-3">
					<p><strong>ID:</strong> {dbSession.id}</p>
					<p><strong>Created:</strong> {new Date(dbSession.created_at).toLocaleString()}</p>
					<p><strong>Topic Count:</strong> {dbSession.topic_count}</p>
					<p><strong>Last Activity:</strong> {new Date(dbSession.last_activity).toLocaleString()}</p>
					{#if dbSession.id === correctSessionId}
						<p class="text-green-600 font-semibold">← This session has your topics!</p>
					{/if}
				</div>
			{/each}
		{:else}
			<p>No sessions found in database</p>
		{/if}
	</div>

	<!-- Database Topics -->
	<div class="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
		<h2 class="text-lg font-semibold mb-4">All Topics in Database</h2>
		{#if allTopics.length > 0}
			{#each allTopics as topic}
				<div class="border-l-4 border-blue-300 pl-4 py-2 mb-3">
					<p><strong>Title:</strong> "{topic.title}"</p>
					<p><strong>Type:</strong> {topic.source_type}</p>
					<p><strong>Session ID:</strong> {topic.session_id}</p>
					<p><strong>Created:</strong> {new Date(topic.created_at).toLocaleString()}</p>
					<p><strong>Has Mind Map:</strong> {topic.mind_map_data ? 'Yes' : 'No'}</p>
				</div>
			{/each}
		{:else}
			<p>No topics found in database</p>
		{/if}
	</div>

	<!-- Actions -->
	<div class="bg-white rounded-lg border border-zinc-200 p-6">
		<h2 class="text-lg font-semibold mb-4">Actions</h2>
		<div class="space-y-3">
			<button
				onclick={setCorrectSession}
				class="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
			>
				Use Session with Topics ({correctSessionId})
			</button>
			
			<button
				onclick={createNewSession}
				class="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
			>
				Create New Session
			</button>
			
			<a
				href="/history"
				class="block w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-center"
			>
				Go to History Dashboard
			</a>
		</div>
	</div>
</div>
