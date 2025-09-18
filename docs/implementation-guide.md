# Explore.fyi - Implementation Guide

## Overview

This guide provides a step-by-step implementation plan for building the Explore.fyi platform. The development is structured in phases to ensure a solid foundation and incremental feature delivery.

## Development Phases Overview

1. **Phase 1**: Project Setup & Foundation (Days 1-3)
2. **Phase 2**: Basic Mind Mapping with Svelte Flow (Days 4-7)
3. **Phase 3**: AI Integration with Genkit (Days 8-12)
4. **Phase 4**: Content Pages & Navigation (Days 13-16)
5. **Phase 5**: Source Tracking & Database (Days 17-20)
6. **Phase 6**: Interactive Features & Polish (Days 21-25)
7. **Phase 7**: Testing & Deployment (Days 26-30)

---

## Phase 1: Project Setup & Foundation (Days 1-3)

### Day 1: Project Initialization

#### 1.1 Create SvelteKit Project
```bash
# Create new SvelteKit project
npx sv create gettoknow-it
cd gettoknow-it

# Choose options:
# - SvelteKit demo app: No
# - Type checking: TypeScript
# - Add ESLint: Yes
# - Add Prettier: Yes
# - Add Playwright: Yes
# - Add Vitest: Yes
```

#### 1.2 Install Core Dependencies
```bash
# Core dependencies
npm install @xyflow/svelte @electric-sql/pglite
npm install @genkit-ai/core @genkit-ai/google-genai

# UI and styling
npm install tailwindcss @tailwindcss/typography
npm install lucide-svelte  # Icons

# Development dependencies
npm install -D @types/node
```

#### 1.3 Configure Tailwind CSS
```bash
# Initialize Tailwind
npx tailwindcss init -p
```

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

#### 1.4 Setup Project Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── mindmap/      # Mind map specific components
│   │   └── layout/       # Layout components
│   ├── stores/           # Svelte stores
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── ai/               # AI integration utilities
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte      # Landing page
│   ├── explore/          # Mind map exploration
│   └── topic/            # Individual topic pages
└── app.html
```

### Day 2: Basic Layout & Styling

#### 2.1 Create App Layout
**src/app.html**
```html
<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Explore.fyi - Explore Topics Through AI</title>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="h-full bg-gray-50">
    <div style="display: contents" class="h-full">%sveltekit.body%</div>
  </body>
</html>
```

#### 2.2 Create Main Layout
**src/routes/+layout.svelte**
```svelte
<script lang="ts">
  import '../app.postcss';
  import Header from '$lib/components/layout/Header.svelte';
</script>

<div class="min-h-screen flex flex-col">
  <Header />
  <main class="flex-1">
    <slot />
  </main>
</div>
```

#### 2.3 Create Header Component
**src/lib/components/layout/Header.svelte**
```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<header class="bg-white border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center py-4">
      <div class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold text-primary-600">
          <a href="/">Explore.fyi</a>
        </h1>
      </div>
      <nav class="flex space-x-4">
        <a href="/" class="text-gray-600 hover:text-primary-600">Home</a>
        <a href="/explore" class="text-gray-600 hover:text-primary-600">Explore</a>
      </nav>
    </div>
  </div>
</header>
```

### Day 3: Landing Page & Input Components

#### 3.1 Create Landing Page
**src/routes/+page.svelte**
```svelte
<script lang="ts">
  import TopicInput from '$lib/components/ui/TopicInput.svelte';
  import UrlInput from '$lib/components/ui/UrlInput.svelte';
  
  let activeTab = 'topic';
</script>

<div class="max-w-4xl mx-auto px-4 py-12">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">
      Explore Any Topic Through AI-Powered Mind Maps
    </h1>
    <p class="text-xl text-gray-600 mb-8">
      Enter a topic or URL and discover interconnected concepts through interactive visualization
    </p>
  </div>

  <div class="bg-white rounded-lg shadow-lg p-8">
    <!-- Tab Navigation -->
    <div class="flex border-b border-gray-200 mb-6">
      <button 
        class="py-2 px-4 border-b-2 {activeTab === 'topic' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}"
        on:click={() => activeTab = 'topic'}
      >
        Explore Topic
      </button>
      <button 
        class="py-2 px-4 border-b-2 {activeTab === 'url' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}"
        on:click={() => activeTab = 'url'}
      >
        Analyze URL
      </button>
    </div>

    <!-- Input Forms -->
    {#if activeTab === 'topic'}
      <TopicInput />
    {:else}
      <UrlInput />
    {/if}
  </div>
</div>
```

---

## Phase 2: Basic Mind Mapping with Svelte Flow (Days 4-7)

### Day 4: Svelte Flow Integration

#### 4.1 Install and Configure Svelte Flow
**src/lib/components/mindmap/MindMap.svelte**
```svelte
<script lang="ts">
  import { SvelteFlow, Background, Controls, MiniMap } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  
  import TopicNode from './nodes/TopicNode.svelte';
  import ConceptNode from './nodes/ConceptNode.svelte';
  
  export let nodes = $state.raw([]);
  export let edges = $state.raw([]);
  
  const nodeTypes = {
    topic: TopicNode,
    concept: ConceptNode
  };
  
  function onNodeClick(event) {
    console.log('Node clicked:', event.detail.node);
  }
</script>

<div class="w-full h-full">
  <SvelteFlow 
    bind:nodes 
    bind:edges 
    {nodeTypes}
    on:nodeclick={onNodeClick}
    fitView
  >
    <Background />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>

<style>
  :global(.svelte-flow) {
    background-color: #fafafa;
  }
</style>
```

#### 4.2 Create Custom Node Components
**src/lib/components/mindmap/nodes/TopicNode.svelte**
```svelte
<script lang="ts">
  import { Handle } from '@xyflow/svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let data;
  export let id;
  
  const dispatch = createEventDispatcher();
  
  function handleExpand() {
    dispatch('expand', { id, data });
  }
  
  function handleNavigate() {
    dispatch('navigate', { id, data });
  }
</script>

<div class="topic-node bg-primary-500 text-white rounded-lg p-4 min-w-48">
  <Handle type="target" position="top" />
  
  <div class="node-content">
    <h3 class="font-bold text-lg mb-2">{data.label}</h3>
    <p class="text-sm opacity-90 mb-3">{data.description}</p>
    
    <div class="flex space-x-2">
      <button 
        on:click|stopPropagation={handleExpand}
        class="bg-white text-primary-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
      >
        Expand
      </button>
      <button 
        on:click|stopPropagation={handleNavigate}
        class="bg-primary-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-primary-700"
      >
        Learn More
      </button>
    </div>
  </div>
  
  <Handle type="source" position="bottom" />
</div>

<style>
  .topic-node {
    border: 2px solid #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
</style>
```

### Day 5: Explore Page Setup

#### 5.1 Create Explore Route
**src/routes/explore/+page.svelte**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import MindMap from '$lib/components/mindmap/MindMap.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  let nodes = $state.raw([]);
  let edges = $state.raw([]);
  let loading = $state(false);
  let topic = $state('');
  
  onMount(() => {
    topic = $page.url.searchParams.get('topic') || '';
    if (topic) {
      initializeMindMap(topic);
    }
  });
  
  async function initializeMindMap(topicName) {
    loading = true;
    
    // Create initial node
    const centerNode = {
      id: '1',
      type: 'topic',
      position: { x: 0, y: 0 },
      data: {
        label: topicName,
        description: `Exploring: ${topicName}`,
        level: 0,
        expandable: true
      }
    };
    
    nodes = [centerNode];
    edges = [];
    loading = false;
  }
  
  function handleNodeExpand(event) {
    console.log('Expanding node:', event.detail);
    // TODO: Implement AI expansion in Phase 3
  }
  
  function handleNodeNavigate(event) {
    console.log('Navigating to node:', event.detail);
    // TODO: Implement navigation in Phase 4
  }
</script>

<div class="h-screen flex flex-col">
  <div class="bg-white border-b border-gray-200 p-4">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900">
        {topic ? `Exploring: ${topic}` : 'Mind Map Explorer'}
      </h1>
    </div>
  </div>
  
  <div class="flex-1 relative">
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    {:else}
      <MindMap 
        bind:nodes 
        bind:edges 
        on:expand={handleNodeExpand}
        on:navigate={handleNodeNavigate}
      />
    {/if}
  </div>
</div>
```

### Day 6-7: Input Components & Navigation

#### 6.1 Create Topic Input Component
**src/lib/components/ui/TopicInput.svelte**
```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  
  let topic = $state('');
  let loading = $state(false);
  
  async function handleSubmit() {
    if (!topic.trim()) return;
    
    loading = true;
    
    // Navigate to explore page with topic
    await goto(`/explore?topic=${encodeURIComponent(topic.trim())}`);
    
    loading = false;
  }
  
  const suggestions = [
    'Photosynthesis',
    'Machine Learning',
    'Climate Change',
    'Quantum Physics',
    'World War II'
  ];
</script>

<div>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <label for="topic" class="block text-sm font-medium text-gray-700 mb-2">
        What topic would you like to explore?
      </label>
      <input
        id="topic"
        type="text"
        bind:value={topic}
        placeholder="Enter any topic (e.g., Artificial Intelligence, Renaissance Art...)"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        disabled={loading}
      />
    </div>
    
    <button
      type="submit"
      disabled={!topic.trim() || loading}
      class="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Creating Mind Map...' : 'Explore Topic'}
    </button>
  </form>
  
  <div class="mt-6">
    <p class="text-sm text-gray-600 mb-3">Try these popular topics:</p>
    <div class="flex flex-wrap gap-2">
      {#each suggestions as suggestion}
        <button
          on:click={() => topic = suggestion}
          class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
        >
          {suggestion}
        </button>
      {/each}
    </div>
  </div>
</div>
```

---

## Phase 3: AI Integration with Genkit (Days 8-12)

### Day 8: Genkit Setup

#### 8.1 Configure Genkit
**src/lib/ai/genkit.ts**
```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI()]
});

export interface TopicBreakdown {
  concepts: Array<{
    id: string;
    title: string;
    description: string;
    relevance: number;
  }>;
  connections: Array<{
    from: string;
    to: string;
    relationship: string;
  }>;
}

export interface ContentPage {
  overview: string;
  details: string;
  examples: string[];
  applications: string[];
  sources: string[];
}
```

#### 8.2 Environment Configuration
**.env.local**
```
GOOGLE_GENAI_API_KEY=your_api_key_here
PUBLIC_APP_URL=http://localhost:5173
```

### Day 9: AI Content Generation

#### 9.1 Topic Analysis Service
**src/lib/ai/topicAnalysis.ts**
```typescript
import { ai, type TopicBreakdown } from './genkit.js';
import { z } from 'zod';

const TopicBreakdownSchema = z.object({
  concepts: z.array(z.object({
    id: z.string(),
    title: z.string(), 
    description: z.string(),
    relevance: z.number()
  })),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relationship: z.string()
  }))
});

export async function analyzeTopic(topic: string): Promise<TopicBreakdown> {
  const response = await ai.generate({
    model: 'gemini-2.5-flash',
    prompt: `Analyze the topic "${topic}" and break it down into 3-5 core concepts. 
    For each concept, provide:
    - A unique ID (using kebab-case)
    - A clear title
    - A brief description (2-3 sentences)
    - A relevance score (1-10)
    
    Also identify relationships between concepts.
    
    Focus on educational value and ensure concepts are interconnected.`,
    output: {
      schema: TopicBreakdownSchema
    }
  });
  
  return response.output;
}

export async function expandConcept(concept: string, parentTopic: string): Promise<TopicBreakdown> {
  const response = await ai.generate({
    model: 'gemini-2.5-flash',
    prompt: `Expand the concept "${concept}" in the context of "${parentTopic}".
    Break it down into 2-4 sub-concepts that provide deeper understanding.
    
    Each sub-concept should:
    - Be more specific than the parent concept
    - Provide educational depth
    - Connect logically to the parent
    
    Include relationships between the new sub-concepts.`,
    output: {
      schema: TopicBreakdownSchema
    }
  });
  
  return response.output;
}
```

### Day 10: URL Analysis Service

#### 10.1 URL Content Extraction
**src/lib/ai/urlAnalysis.ts**
```typescript
import { ai, type TopicBreakdown } from './genkit.js';

export async function analyzeUrl(url: string): Promise<TopicBreakdown> {
  // In a real implementation, you'd fetch and parse the URL content
  // For now, we'll simulate with the URL as input
  
  const response = await ai.generate({
    model: 'gemini-2.5-flash',
    prompt: `Analyze the content from this URL: ${url}
    
    Extract the main concepts and topics discussed.
    Break them down into 3-5 core concepts with:
    - Unique IDs
    - Clear titles
    - Descriptive explanations
    - Relevance scores
    
    Identify relationships between the concepts.
    
    If you cannot access the URL directly, analyze what topics this URL likely covers based on its structure and domain.`,
    output: {
      schema: TopicBreakdownSchema
    }
  });
  
  return response.output;
}

// Helper function to extract domain info
export function extractUrlInfo(url: string) {
  try {
    const urlObj = new URL(url);
    return {
      domain: urlObj.hostname,
      path: urlObj.pathname,
      isEducational: /\.(edu|ac\.|org)/.test(urlObj.hostname)
    };
  } catch {
    return null;
  }
}
```

### Day 11-12: Integrate AI with Mind Map

#### 11.1 Update Explore Page with AI
**src/routes/explore/+page.svelte** (Updated)
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { analyzeTopic, expandConcept } from '$lib/ai/topicAnalysis.js';
  import { analyzeUrl } from '$lib/ai/urlAnalysis.js';
  import MindMap from '$lib/components/mindmap/MindMap.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  let nodes = $state.raw([]);
  let edges = $state.raw([]);
  let loading = $state(false);
  let topic = $state('');
  let sourceUrl = $state('');
  
  onMount(() => {
    topic = $page.url.searchParams.get('topic') || '';
    sourceUrl = $page.url.searchParams.get('url') || '';
    
    if (topic) {
      initializeFromTopic(topic);
    } else if (sourceUrl) {
      initializeFromUrl(sourceUrl);
    }
  });
  
  async function initializeFromTopic(topicName: string) {
    loading = true;
    
    try {
      const breakdown = await analyzeTopic(topicName);
      createMindMapFromBreakdown(topicName, breakdown);
    } catch (error) {
      console.error('Error analyzing topic:', error);
      // Fallback to basic node
      createFallbackMindMap(topicName);
    }
    
    loading = false;
  }
  
  async function initializeFromUrl(url: string) {
    loading = true;
    
    try {
      const breakdown = await analyzeUrl(url);
      createMindMapFromBreakdown(`Content from ${url}`, breakdown);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      createFallbackMindMap(`Content from ${url}`);
    }
    
    loading = false;
  }
  
  function createMindMapFromBreakdown(mainTopic: string, breakdown: any) {
    // Create center node
    const centerNode = {
      id: 'center',
      type: 'topic',
      position: { x: 0, y: 0 },
      data: {
        label: mainTopic,
        description: `Main topic: ${mainTopic}`,
        level: 0,
        expandable: true
      }
    };
    
    // Create concept nodes in a circle around the center
    const conceptNodes = breakdown.concepts.map((concept: any, index: number) => {
      const angle = (index * 2 * Math.PI) / breakdown.concepts.length;
      const radius = 300;
      
      return {
        id: concept.id,
        type: 'concept',
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        },
        data: {
          label: concept.title,
          description: concept.description,
          level: 1,
          expandable: true,
          relevance: concept.relevance
        }
      };
    });
    
    // Create edges from center to concepts
    const conceptEdges = breakdown.concepts.map((concept: any) => ({
      id: `center-${concept.id}`,
      source: 'center',
      target: concept.id,
      type: 'smoothstep'
    }));
    
    // Create edges between related concepts
    const relationshipEdges = breakdown.connections.map((conn: any, index: number) => ({
      id: `rel-${index}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      style: 'stroke: #94a3b8; stroke-dasharray: 5,5;'
    }));
    
    nodes = [centerNode, ...conceptNodes];
    edges = [...conceptEdges, ...relationshipEdges];
  }
  
  function createFallbackMindMap(mainTopic: string) {
    const centerNode = {
      id: 'center',
      type: 'topic',
      position: { x: 0, y: 0 },
      data: {
        label: mainTopic,
        description: `Exploring: ${mainTopic}`,
        level: 0,
        expandable: true
      }
    };
    
    nodes = [centerNode];
    edges = [];
  }
  
  async function handleNodeExpand(event: any) {
    const { id, data } = event.detail;
    
    if (data.level >= 3) return; // Limit depth for MVP
    
    loading = true;
    
    try {
      const breakdown = await expandConcept(data.label, topic || sourceUrl);
      addExpandedNodes(id, data, breakdown);
    } catch (error) {
      console.error('Error expanding node:', error);
    }
    
    loading = false;
  }
  
  function addExpandedNodes(parentId: string, parentData: any, breakdown: any) {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    const newNodes = breakdown.concepts.map((concept: any, index: number) => {
      const angle = (index * 2 * Math.PI) / breakdown.concepts.length;
      const radius = 200;
      
      return {
        id: `${parentId}-${concept.id}`,
        type: 'concept',
        position: {
          x: parentNode.position.x + Math.cos(angle) * radius,
          y: parentNode.position.y + Math.sin(angle) * radius
        },
        data: {
          label: concept.title,
          description: concept.description,
          level: parentData.level + 1,
          expandable: parentData.level < 2, // Limit expansion depth
          relevance: concept.relevance
        }
      };
    });
    
    const newEdges = breakdown.concepts.map((concept: any) => ({
      id: `${parentId}-${concept.id}-edge`,
      source: parentId,
      target: `${parentId}-${concept.id}`,
      type: 'smoothstep'
    }));
    
    nodes = [...nodes, ...newNodes];
    edges = [...edges, ...newEdges];
  }
  
  function handleNodeNavigate(event: any) {
    const { id, data } = event.detail;
    // TODO: Navigate to content page (Phase 4)
    console.log('Navigate to:', data.label);
  }
</script>

<!-- Rest of template remains the same -->
```

---

## Phase 4: Content Pages & Navigation (Days 13-16)

### Day 13: Content Generation Service

#### 13.1 Create Content Service
**src/lib/ai/contentGeneration.ts**
```typescript
import { ai, type ContentPage } from './genkit.js';
import { z } from 'zod';

const ContentPageSchema = z.object({
  overview: z.string(),
  details: z.string(),
  examples: z.array(z.string()),
  applications: z.array(z.string()),
  keyPoints: z.array(z.string()),
  relatedConcepts: z.array(z.string())
});

export async function generateContentPage(
  concept: string, 
  context: string = ''
): Promise<ContentPage> {
  const response = await ai.generate({
    model: 'gemini-2.5-flash',
    prompt: `Create comprehensive educational content for the concept "${concept}"${context ? ` in the context of "${context}"` : ''}.

    Structure the content as follows:

    1. OVERVIEW: A clear, concise introduction (2-3 paragraphs) that explains what this concept is and why it matters.

    2. DETAILS: In-depth explanation (4-5 paragraphs) covering:
       - Core principles and mechanisms
       - How it works or functions
       - Key characteristics and properties
       - Important considerations

    3. EXAMPLES: 3-5 concrete, real-world examples that illustrate the concept clearly.

    4. APPLICATIONS: 3-5 practical applications or use cases where this concept is applied.

    5. KEY POINTS: 5-7 essential takeaways that students should remember.

    6. RELATED CONCEPTS: 4-6 related concepts that connect to this topic.

    Make the content engaging, educational, and appropriate for students. Use clear language and provide specific examples.`,
    output: {
      schema: ContentPageSchema
    }
  });
  
  return response.output;
}

export async function generateSourceSuggestions(concept: string): Promise<string[]> {
  const response = await ai.generate({
    model: 'gemini-2.5-flash',
    prompt: `Suggest 5-7 high-quality, educational sources for learning about "${concept}".
    
    Include a mix of:
    - Educational websites (.edu domains)
    - Reputable organizations
    - Academic resources
    - Documentation sites
    - Online courses platforms
    
    Return only the URLs, one per line.`
  });
  
  return response.text.split('\n').filter(url => url.trim().length > 0);
}
```

### Day 14: Topic Page Layout

#### 14.1 Create Topic Page Route
**src/routes/topic/[id]/+page.svelte**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { generateContentPage, generateSourceSuggestions } from '$lib/ai/contentGeneration.js';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ContentSection from '$lib/components/content/ContentSection.svelte';
  import SourcesList from '$lib/components/content/SourcesList.svelte';
  import RelatedConcepts from '$lib/components/content/RelatedConcepts.svelte';
  
  let loading = $state(true);
  let content = $state(null);
  let sources = $state([]);
  let concept = $state('');
  let context = $state('');
  
  onMount(async () => {
    concept = $page.params.id;
    context = $page.url.searchParams.get('context') || '';
    
    await loadContent();
  });
  
  async function loadContent() {
    loading = true;
    
    try {
      const [contentData, sourcesData] = await Promise.all([
        generateContentPage(concept, context),
        generateSourceSuggestions(concept)
      ]);
      
      content = contentData;
      sources = sourcesData;
    } catch (error) {
      console.error('Error loading content:', error);
    }
    
    loading = false;
  }
  
  function goBack() {
    window.history.back();
  }
</script>

<svelte:head>
  <title>{concept} - Explore.fyi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <div class="flex items-center space-x-4">
        <button 
          on:click={goBack}
          class="text-gray-500 hover:text-gray-700"
        >
          ← Back to Mind Map
        </button>
        <h1 class="text-3xl font-bold text-gray-900">{concept}</h1>
      </div>
      {#if context}
        <p class="text-gray-600 mt-2">In the context of: {context}</p>
      {/if}
    </div>
  </div>
  
  <!-- Content -->
  <div class="max-w-4xl mx-auto px-4 py-8">
    {#if loading}
      <div class="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    {:else if content}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <ContentSection title="Overview" content={content.overview} />
          <ContentSection title="Detailed Explanation" content={content.details} />
          
          <div class="bg-white rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Examples</h2>
            <ul class="space-y-3">
              {#each content.examples as example}
                <li class="flex items-start space-x-3">
                  <span class="text-primary-500 mt-1">•</span>
                  <span>{example}</span>
                </li>
              {/each}
            </ul>
          </div>
          
          <div class="bg-white rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Applications</h2>
            <ul class="space-y-3">
              {#each content.applications as application}
                <li class="flex items-start space-x-3">
                  <span class="text-green-500 mt-1">•</span>
                  <span>{application}</span>
                </li>
              {/each}
            </ul>
          </div>
          
          <div class="bg-blue-50 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4 text-blue-900">Key Takeaways</h2>
            <ul class="space-y-2">
              {#each content.keyPoints as point}
                <li class="flex items-start space-x-3">
                  <span class="text-blue-600 mt-1">✓</span>
                  <span class="text-blue-800">{point}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="space-y-6">
          <RelatedConcepts concepts={content.relatedConcepts} />
          <SourcesList {sources} />
        </div>
      </div>
    {/if}
  </div>
</div>
```

### Day 15-16: Content Components

#### 15.1 Content Section Component
**src/lib/components/content/ContentSection.svelte**
```svelte
<script lang="ts">
  export let title: string;
  export let content: string;
</script>

<div class="bg-white rounded-lg p-6">
  <h2 class="text-xl font-semibold mb-4">{title}</h2>
  <div class="prose prose-gray max-w-none">
    {#each content.split('\n\n') as paragraph}
      <p>{paragraph}</p>
    {/each}
  </div>
</div>
```

#### 15.2 Update Node Navigation
**src/lib/components/mindmap/nodes/TopicNode.svelte** (Updated)
```svelte
<script lang="ts">
  import { Handle } from '@xyflow/svelte';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  
  export let data;
  export let id;
  
  const dispatch = createEventDispatcher();
  
  function handleExpand() {
    dispatch('expand', { id, data });
  }
  
  function handleNavigate() {
    // Navigate to topic page with context
    const context = data.parentTopic || '';
    goto(`/topic/${encodeURIComponent(data.label)}?context=${encodeURIComponent(context)}`);
  }
</script>

<!-- Template remains the same, but now handleNavigate actually navigates -->
```

---

## Phase 5: Source Tracking & Database (Days 17-20)

### Day 17: Database Setup

#### 17.1 Initialize PgLite Database
**src/lib/database/init.ts**
```typescript
import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

export async function initDatabase(): Promise<PGlite> {
  if (db) return db;
  
  db = new PGlite();
  
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_identifier TEXT,
      root_topic TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content_overview TEXT,
      content_details TEXT,
      content_examples TEXT,
      content_applications TEXT,
      parent_id TEXT REFERENCES topics(id),
      level INTEGER NOT NULL,
      session_id TEXT REFERENCES sessions(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      credibility_score INTEGER,
      topic_id TEXT REFERENCES topics(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS content_progress (
      id TEXT PRIMARY KEY,
      topic_id TEXT REFERENCES topics(id),
      session_id TEXT REFERENCES sessions(id),
      section_completed TEXT,
      completion_percentage INTEGER DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
  `);
  
  return db;
}

export async function getDatabase(): Promise<PGlite> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}
```

### Day 18: Session Management

#### 18.1 Session Store
**src/lib/stores/session.ts**
```typescript
import { writable } from 'svelte/store';
import { getDatabase } from '$lib/database/init.js';

interface Session {
  id: string;
  rootTopic: string;
  createdAt: Date;
  lastAccessed: Date;
}

export const currentSession = writable<Session | null>(null);

export async function createSession(rootTopic: string): Promise<string> {
  const db = await getDatabase();
  const sessionId = crypto.randomUUID();
  
  await db.exec({
    query: `INSERT INTO sessions (id, root_topic) VALUES ($1, $2)`,
    params: [sessionId, rootTopic]
  });
  
  const session: Session = {
    id: sessionId,
    rootTopic,
    createdAt: new Date(),
    lastAccessed: new Date()
  };
  
  currentSession.set(session);
  return sessionId;
}

export async function saveTopic(
  sessionId: string, 
  topicData: any
): Promise<void> {
  const db = await getDatabase();
  
  await db.exec({
    query: `INSERT INTO topics 
      (id, title, description, parent_id, level, session_id) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
    params: [
      topicData.id,
      topicData.title,
      topicData.description,
      topicData.parentId || null,
      topicData.level,
      sessionId
    ]
  });
}

export async function saveTopicContent(
  topicId: string,
  content: any
): Promise<void> {
  const db = await getDatabase();
  
  await db.exec({
    query: `UPDATE topics SET 
      content_overview = $1,
      content_details = $2,
      content_examples = $3,
      content_applications = $4
      WHERE id = $5`,
    params: [
      content.overview,
      content.details,
      JSON.stringify(content.examples),
      JSON.stringify(content.applications),
      topicId
    ]
  });
}
```

### Day 19: Source Tracking

#### 19.1 Source Management Service
**src/lib/services/sourceTracking.ts**
```typescript
import { getDatabase } from '$lib/database/init.js';

interface Source {
  id: string;
  url: string;
  title: string;
  description: string;
  credibilityScore: number;
  topicId: string;
}

export async function saveSource(source: Omit<Source, 'id'>): Promise<string> {
  const db = await getDatabase();
  const sourceId = crypto.randomUUID();
  
  await db.exec({
    query: `INSERT INTO sources 
      (id, url, title, description, credibility_score, topic_id) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
    params: [
      sourceId,
      source.url,
      source.title,
      source.description,
      source.credibilityScore,
      source.topicId
    ]
  });
  
  return sourceId;
}

export async function getSourcesForTopic(topicId: string): Promise<Source[]> {
  const db = await getDatabase();
  
  const result = await db.query(`
    SELECT * FROM sources WHERE topic_id = $1 
    ORDER BY credibility_score DESC, created_at ASC
  `, [topicId]);
  
  return result.rows as Source[];
}

export async function validateSource(url: string): Promise<number> {
  // Simple credibility scoring based on domain
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('.edu') || domain.includes('.ac.')) return 9;
  if (domain.includes('.gov')) return 8;
  if (domain.includes('.org')) return 7;
  if (domain.includes('wikipedia')) return 6;
  if (domain.includes('britannica')) return 8;
  if (domain.includes('coursera') || domain.includes('edx')) return 7;
  
  return 5; // Default score
}
```

### Day 20: Integrate Source Tracking

#### 20.1 Update AI Services with Source Tracking
**src/lib/ai/topicAnalysis.ts** (Updated)
```typescript
// Add to existing file
import { saveSource, validateSource } from '$lib/services/sourceTracking.js';

export async function analyzeTopicWithSources(
  topic: string, 
  topicId: string
): Promise<TopicBreakdown> {
  const breakdown = await analyzeTopic(topic);
  
  // Generate and save sources
  const sources = await generateSourceSuggestions(topic);
  
  for (const url of sources) {
    try {
      const credibilityScore = await validateSource(url);
      await saveSource({
        url,
        title: `Resource for ${topic}`,
        description: `Educational resource about ${topic}`,
        credibilityScore,
        topicId
      });
    } catch (error) {
      console.warn('Failed to save source:', url, error);
    }
  }
  
  return breakdown;
}
```

---

## Phase 6: Interactive Features & Polish (Days 21-25)

### Day 21: Progress Tracking

#### 21.1 Progress Service
**src/lib/services/progressTracking.ts**
```typescript
import { getDatabase } from '$lib/database/init.js';

export async function trackContentProgress(
  topicId: string,
  sessionId: string,
  section: string,
  timeSpent: number
): Promise<void> {
  const db = await getDatabase();
  
  // Update or insert progress
  await db.exec({
    query: `INSERT INTO content_progress 
      (id, topic_id, session_id, section_completed, time_spent_seconds)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (topic_id, session_id, section_completed) 
      DO UPDATE SET 
        time_spent_seconds = time_spent_seconds + $5,
        last_accessed = CURRENT_TIMESTAMP`,
    params: [
      crypto.randomUUID(),
      topicId,
      sessionId,
      section,
      timeSpent
    ]
  });
}

export async function getTopicProgress(
  topicId: string,
  sessionId: string
): Promise<any> {
  const db = await getDatabase();
  
  const result = await db.query(`
    SELECT * FROM content_progress 
    WHERE topic_id = $1 AND session_id = $2
  `, [topicId, sessionId]);
  
  return result.rows;
}
```

### Day 22-23: Enhanced UI Components

#### 22.1 Search Component
**src/lib/components/ui/SearchBar.svelte**
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let placeholder = "Search mind map...";
  let query = $state('');
  
  const dispatch = createEventDispatcher();
  
  function handleSearch() {
    dispatch('search', { query });
  }
  
  $effect(() => {
    if (query.length > 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  });
</script>

<div class="relative">
  <input
    type="text"
    bind:value={query}
    {placeholder}
    class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  />
  <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
  </div>
</div>
```

#### 22.2 Export Functionality
**src/lib/utils/exportUtils.ts**
```typescript
export function exportMindMapAsImage(containerId: string, filename: string) {
  // Implementation for exporting mind map as PNG
  // This would use libraries like html2canvas
}

export function exportMindMapAsJSON(nodes: any[], edges: any[], filename: string) {
  const data = {
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Day 24-25: Performance & Polish

#### 24.1 Performance Optimizations
- Implement virtual scrolling for large mind maps
- Add lazy loading for content pages
- Optimize AI API calls with caching
- Add loading states and error handling

#### 24.2 UI Polish
- Add animations and transitions
- Implement responsive design
- Add keyboard shortcuts
- Improve accessibility

---

## Phase 7: Testing & Deployment (Days 26-30)

### Day 26-27: Testing

#### 26.1 Unit Tests
```typescript
// tests/ai/topicAnalysis.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeTopic } from '$lib/ai/topicAnalysis.js';

describe('Topic Analysis', () => {
  it('should analyze a topic and return concepts', async () => {
    const result = await analyzeTopic('Machine Learning');
    
    expect(result.concepts).toBeDefined();
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.connections).toBeDefined();
  });
});
```

#### 26.2 Integration Tests
```typescript
// tests/components/MindMap.test.ts
import { render, screen } from '@testing-library/svelte';
import MindMap from '$lib/components/mindmap/MindMap.svelte';

describe('MindMap Component', () => {
  it('renders nodes correctly', () => {
    const nodes = [
      { id: '1', type: 'topic', position: { x: 0, y: 0 }, data: { label: 'Test' } }
    ];
    
    render(MindMap, { nodes, edges: [] });
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Day 28: Environment Setup

#### 28.1 Production Configuration
```typescript
// src/lib/config/environment.ts
export const config = {
  isDevelopment: import.meta.env.DEV,
  apiKeys: {
    googleGenAI: import.meta.env.VITE_GOOGLE_GENAI_API_KEY,
  },
  database: {
    url: import.meta.env.VITE_DATABASE_URL || 'local',
  },
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  }
};
```

### Day 29: Build & Deploy

#### 29.1 Build Configuration
```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2020',
    rollupOptions: {
      external: ['@electric-sql/pglite'],
    },
  },
  optimizeDeps: {
    include: ['@xyflow/svelte'],
  },
});
```

#### 29.2 Deployment Scripts
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && npm run deploy:vercel",
    "deploy:vercel": "vercel --prod"
  }
}
```

### Day 30: Final Testing & Launch

#### 30.1 End-to-End Tests
- User can enter a topic and generate mind map
- Node expansion works correctly
- Content pages load with AI-generated content
- Source tracking functions properly
- Export functionality works

#### 30.2 Performance Audit
- Page load speeds
- AI response times
- Database query performance
- Memory usage optimization

---

## Quality Assurance Checklist

### Functionality
- [ ] Topic input generates mind map
- [ ] URL analysis works correctly
- [ ] Node expansion creates sub-concepts
- [ ] Content pages display comprehensive information
- [ ] Source tracking and validation
- [ ] Progress tracking and persistence
- [ ] Export functionality

### Performance
- [ ] Initial load time < 3 seconds
- [ ] AI responses < 5 seconds
- [ ] Smooth animations and transitions
- [ ] Responsive on mobile devices
- [ ] Efficient memory usage

### User Experience
- [ ] Intuitive navigation
- [ ] Clear visual hierarchy
- [ ] Helpful loading states
- [ ] Error handling and messages
- [ ] Accessibility compliance
- [ ] Cross-browser compatibility

### Technical
- [ ] TypeScript type safety
- [ ] Error boundaries
- [ ] API rate limiting
- [ ] Data validation
- [ ] Security measures
- [ ] Environment configuration

---

## Post-Launch Roadmap

### Week 1-2: Monitoring & Bug Fixes
- Monitor user interactions
- Fix critical bugs
- Optimize performance based on real usage

### Week 3-4: Feature Enhancements
- Advanced search functionality
- Improved source recommendation
- User feedback system

### Month 2: Advanced Features
- User accounts and saved sessions
- Collaborative mind mapping
- Integration with educational platforms

### Month 3+: Scale & Expand
- Advanced AI models
- Multilingual support
- Mobile app development
- API for third-party integrations

---

This implementation guide provides a complete roadmap for building Explore.fyi from start to finish. Each phase builds upon the previous one, ensuring a solid foundation and systematic feature delivery.
