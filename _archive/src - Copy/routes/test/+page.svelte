<script lang="ts">
	import { onMount } from 'svelte';
	import { CheckCircle, XCircle, AlertCircle, Database, Globe, Key, Server } from 'lucide-svelte';
	
	// Test results state
	let testResults = $state({
		dbConnection: { status: 'pending' as const, message: '', details: null as any },
		supabaseApi: { status: 'pending' as const, message: '', details: null as any },
		authentication: { status: 'pending' as const, message: '', details: null as any },
		tableAccess: { status: 'pending' as const, message: '', details: null as any },
		sessionCreation: { status: 'pending' as const, message: '', details: null as any }
	});

	let isRunning = $state(false);
	let config = $state({
		supabaseUrl: 'https://kong-production-413c.up.railway.app',
		anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU4MjE0NDU4LCJleHAiOjE3ODk3NTA0NTh9.WvzpYKisqN_40jS27rclKHHm2mGOKVB8o-goV_-DKxE',
		postgresUrl: 'postgresql://supabase_admin:kam8nkm2lwhsz6rsudtv6q5a5zw3tmzyuxz9w7wszm4etd8gn0zcm4a22vfyhsdk@mainline.proxy.rlwy.net:36402/postgres'
	});

	async function runTests() {
		isRunning = true;
		
		// Reset all test results
		testResults = {
			dbConnection: { status: 'running', message: 'Testing...', details: null },
			supabaseApi: { status: 'pending', message: '', details: null },
			authentication: { status: 'pending', message: '', details: null },
			tableAccess: { status: 'pending', message: '', details: null },
			sessionCreation: { status: 'pending', message: '', details: null }
		};

		try {
			// Test 1: Direct Database Connection
			await testDatabaseConnection();
			
			// Test 2: Supabase API Availability
			await testSupabaseApi();
			
			// Test 3: Authentication
			await testAuthentication();
			
			// Test 4: Table Access
			await testTableAccess();
			
			// Test 5: Session Creation
			await testSessionCreation();
			
		} catch (error) {
			console.error('Test suite error:', error);
		} finally {
			isRunning = false;
		}
	}

	async function testDatabaseConnection() {
		try {
			const response = await fetch('/test/api/db-health');
			const result = await response.json();
			
			if (result.success) {
				testResults.dbConnection = {
					status: 'success',
					message: 'Database connection successful',
					details: {
						timestamp: result.data.current_time,
						version: result.data.pg_version?.split(' ')[0],
						tables: result.data.tables || []
					}
				};
			} else {
				testResults.dbConnection = {
					status: 'error',
					message: result.error || 'Database connection failed',
					details: null
				};
			}
		} catch (error: any) {
			testResults.dbConnection = {
				status: 'error',
				message: `Connection test failed: ${error?.message || 'Unknown error'}`,
				details: null
			};
		}
	}

	async function testSupabaseApi() {
		testResults.supabaseApi = { status: 'running', message: 'Testing...', details: null };
		
		try {
			// Test if Supabase API endpoint is reachable
			const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
				method: 'HEAD',
				headers: {
					'apikey': config.anonKey,
					'Authorization': `Bearer ${config.anonKey}`
				}
			});
			
			if (response.ok || response.status === 404) { // 404 is expected for root endpoint
				testResults.supabaseApi = {
					status: 'success',
					message: 'Supabase API endpoint is reachable',
					details: {
						status: response.status,
						statusText: response.statusText,
						url: config.supabaseUrl
					}
				};
			} else {
				testResults.supabaseApi = {
					status: 'error',
					message: `API returned status ${response.status}`,
					details: { status: response.status, statusText: response.statusText }
				};
			}
		} catch (error: any) {
			testResults.supabaseApi = {
				status: 'error',
				message: `API test failed: ${error?.message || 'Unknown error'}`,
				details: null
			};
		}
	}

	async function testAuthentication() {
		testResults.authentication = { status: 'running', message: 'Testing...', details: null };
		
		try {
			// Test JWT token validation
			const response = await fetch(`${config.supabaseUrl}/rest/v1/sessions?select=count&limit=1`, {
				headers: {
					'apikey': config.anonKey,
					'Authorization': `Bearer ${config.anonKey}`,
					'Content-Type': 'application/json',
					'Prefer': 'count=exact'
				}
			});
			
			if (response.ok) {
				testResults.authentication = {
					status: 'success',
					message: 'JWT token authentication successful',
					details: {
						status: response.status,
						headers: Object.fromEntries(response.headers.entries())
					}
				};
			} else {
				const errorText = await response.text();
				testResults.authentication = {
					status: 'error',
					message: `Authentication failed: ${response.status} ${response.statusText}`,
					details: { status: response.status, error: errorText }
				};
			}
		} catch (error: any) {
			testResults.authentication = {
				status: 'error',
				message: `Authentication test failed: ${error?.message || 'Unknown error'}`,
				details: null
			};
		}
	}

	async function testTableAccess() {
		testResults.tableAccess = { status: 'running', message: 'Testing...', details: null };
		
		try {
			const tables = ['sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations'];
			const results: Record<string, any> = {};
			
			for (const table of tables) {
				try {
					const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?select=count&limit=1`, {
						headers: {
							'apikey': config.anonKey,
							'Authorization': `Bearer ${config.anonKey}`,
							'Content-Type': 'application/json'
						}
					});
					
					results[table] = {
						status: response.ok ? 'accessible' : 'error',
						code: response.status
					};
				} catch (error) {
					results[table] = {
						status: 'error',
						code: 'NETWORK_ERROR'
					};
				}
			}
			
			const accessibleTables = Object.entries(results).filter(([, result]: [string, any]) => result.status === 'accessible');
			
			testResults.tableAccess = {
				status: accessibleTables.length > 0 ? 'success' : 'error',
				message: `${accessibleTables.length}/${tables.length} tables accessible`,
				details: results
			};
		} catch (error: any) {
			testResults.tableAccess = {
				status: 'error',
				message: `Table access test failed: ${error?.message || 'Unknown error'}`,
				details: null
			};
		}
	}

	async function testSessionCreation() {
		testResults.sessionCreation = { status: 'running', message: 'Testing...', details: null };
		
		try {
			// Try to create a test session
			const sessionData = {
				settings: { test: true, created_by: 'test-page' },
				topic_count: 0
			};
			
			const response = await fetch(`${config.supabaseUrl}/rest/v1/sessions`, {
				method: 'POST',
				headers: {
					'apikey': config.anonKey,
					'Authorization': `Bearer ${config.anonKey}`,
					'Content-Type': 'application/json',
					'Prefer': 'return=representation'
				},
				body: JSON.stringify(sessionData)
			});
			
			if (response.ok) {
				const data = await response.json();
				
				// Clean up test session
				await fetch(`${config.supabaseUrl}/rest/v1/sessions?id=eq.${data[0].id}`, {
					method: 'DELETE',
					headers: {
						'apikey': config.anonKey,
						'Authorization': `Bearer ${config.anonKey}`
					}
				});
				
				testResults.sessionCreation = {
					status: 'success',
					message: 'Session creation and deletion successful',
					details: { sessionId: data[0].id }
				};
			} else {
				const errorText = await response.text();
				testResults.sessionCreation = {
					status: 'error',
					message: `Session creation failed: ${response.status} ${response.statusText}`,
					details: { status: response.status, error: errorText }
				};
			}
		} catch (error: any) {
			testResults.sessionCreation = {
				status: 'error',
				message: `Session creation test failed: ${error?.message || 'Unknown error'}`,
				details: null
			};
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success': return CheckCircle;
			case 'error': return XCircle;
			case 'running': return AlertCircle;
			default: return AlertCircle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'success': return 'text-green-600';
			case 'error': return 'text-red-600';
			case 'running': return 'text-yellow-600';
			default: return 'text-gray-400';
		}
	}

	onMount(() => {
		// Auto-run tests when page loads
		runTests();
	});
</script>

<svelte:head>
	<title>Database & API Test Dashboard - Explore.fyi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Database & API Test Dashboard</h1>
			<p class="text-gray-600">Development environment testing for Explore.fyi</p>
		</div>

		<!-- Configuration Panel -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
				<Server class="h-5 w-5 mr-2" />
				Configuration
			</h2>
			<div class="grid grid-cols-1 gap-4">
				<div>
					<label for="supabase-url" class="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
					<input 
						id="supabase-url"
						type="text" 
						bind:value={config.supabaseUrl}
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50"
						readonly
					/>
				</div>
				<div>
					<label for="anon-key" class="block text-sm font-medium text-gray-700 mb-1">Anonymous Key</label>
					<input 
						id="anon-key"
						type="password" 
						value={config.anonKey}
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono bg-gray-50"
						readonly
					/>
				</div>
			</div>
		</div>

		<!-- Test Controls -->
		<div class="flex justify-center mb-6">
				<button 
				onclick={runTests}
					disabled={isRunning}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
				>
				{isRunning ? 'Running Tests...' : 'Run Tests'}
				</button>
			</div>
			
		<!-- Test Results -->
		<div class="space-y-4">
			<!-- Database Connection Test -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center">
						<Database class="h-5 w-5 mr-2" />
						Direct Database Connection
					</h3>
					<div class="flex items-center">
						{#snippet statusIcon()}
							{@const Icon = getStatusIcon(testResults.dbConnection.status)}
							<Icon class="h-5 w-5 {getStatusColor(testResults.dbConnection.status)}" />
						{/snippet}
						{@render statusIcon()}
					</div>
				</div>
				<p class="text-gray-600 mb-2">{testResults.dbConnection.message}</p>
				{#if testResults.dbConnection.details}
					<div class="bg-gray-50 rounded p-3 text-sm">
						<p><strong>Timestamp:</strong> {testResults.dbConnection.details?.timestamp || 'N/A'}</p>
						<p><strong>PostgreSQL Version:</strong> {testResults.dbConnection.details?.version || 'N/A'}</p>
						<p><strong>Tables Found:</strong> {testResults.dbConnection.details?.tables?.length || 0}</p>
				</div>
			{/if}
			</div>

			<!-- Supabase API Test -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center">
						<Globe class="h-5 w-5 mr-2" />
						Supabase API Endpoint
					</h3>
					<div class="flex items-center">
						{#snippet statusIcon()}
							{@const Icon = getStatusIcon(testResults.supabaseApi.status)}
							<Icon class="h-5 w-5 {getStatusColor(testResults.supabaseApi.status)}" />
						{/snippet}
						{@render statusIcon()}
					</div>
				</div>
				<p class="text-gray-600 mb-2">{testResults.supabaseApi.message}</p>
				{#if testResults.supabaseApi.details}
					<div class="bg-gray-50 rounded p-3 text-sm">
						<p><strong>Status:</strong> {testResults.supabaseApi.details?.status || 'N/A'}</p>
						<p><strong>URL:</strong> {testResults.supabaseApi.details?.url || 'N/A'}</p>
				</div>
			{/if}
							</div>
							
			<!-- Authentication Test -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center">
						<Key class="h-5 w-5 mr-2" />
						JWT Authentication
					</h3>
					<div class="flex items-center">
						{#snippet statusIcon()}
							{@const Icon = getStatusIcon(testResults.authentication.status)}
							<Icon class="h-5 w-5 {getStatusColor(testResults.authentication.status)}" />
						{/snippet}
						{@render statusIcon()}
					</div>
				</div>
				<p class="text-gray-600 mb-2">{testResults.authentication.message}</p>
				{#if testResults.authentication.details}
					<div class="bg-gray-50 rounded p-3 text-sm">
						<p><strong>HTTP Status:</strong> {testResults.authentication.details?.status || 'N/A'}</p>
						{#if testResults.authentication.details?.error}
							<p><strong>Error:</strong> {testResults.authentication.details.error}</p>
						{/if}
					</div>
				{/if}
								</div>
								
			<!-- Table Access Test -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center">
						<Database class="h-5 w-5 mr-2" />
						Table Access
					</h3>
					<div class="flex items-center">
						{#snippet statusIcon()}
							{@const Icon = getStatusIcon(testResults.tableAccess.status)}
							<Icon class="h-5 w-5 {getStatusColor(testResults.tableAccess.status)}" />
						{/snippet}
						{@render statusIcon()}
								</div>
								</div>
				<p class="text-gray-600 mb-2">{testResults.tableAccess.message}</p>
				{#if testResults.tableAccess.details}
					<div class="bg-gray-50 rounded p-3 text-sm">
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(testResults.tableAccess.details) as [table, result]}
								<div class="flex items-center justify-between">
									<span>{table}:</span>
									<span class="font-medium {(result as any)?.status === 'accessible' ? 'text-green-600' : 'text-red-600'}">
										{(result as any)?.status === 'accessible' ? '✓' : '✗'} ({(result as any)?.code})
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Session Creation Test -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900 flex items-center">
						<CheckCircle class="h-5 w-5 mr-2" />
						Session Creation
					</h3>
					<div class="flex items-center">
						{#snippet statusIcon()}
							{@const Icon = getStatusIcon(testResults.sessionCreation.status)}
							<Icon class="h-5 w-5 {getStatusColor(testResults.sessionCreation.status)}" />
						{/snippet}
						{@render statusIcon()}
					</div>
				</div>
				<p class="text-gray-600 mb-2">{testResults.sessionCreation.message}</p>
				{#if testResults.sessionCreation.details}
					<div class="bg-gray-50 rounded p-3 text-sm">
						{#if testResults.sessionCreation.details?.sessionId}
							<p><strong>Test Session ID:</strong> {testResults.sessionCreation.details.sessionId}</p>
						{/if}
						{#if testResults.sessionCreation.details?.error}
							<p><strong>Error:</strong> {testResults.sessionCreation.details.error}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Development Note -->
		<div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
			<p class="text-yellow-800 text-sm">
				<strong>Development Only:</strong> This test page is only available in development mode (npm run dev) and will not be accessible in production.
			</p>
		</div>
	</div>
</div>