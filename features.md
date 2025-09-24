# Explore.fyi - Student Topic Exploration Platform

## Overview

Explore.fyi is an interactive learning platform that helps students explore and understand complex topics through dynamic mind mapping and AI-powered content breakdown. The app allows students to either enter a topic directly or provide a URL as a starting point, then generates interactive mind maps that can be expanded infinitely for deeper exploration.

## Core Features

### 1. Topic Input Methods

#### Direct Topic Entry
- Students can enter any topic or subject they want to explore
- Examples: "Photosynthesis", "World War II", "Machine Learning", "Quantum Physics"
- AI processes the topic and generates 2-5 core concepts/areas

#### URL-Based Topic Extraction
- Students can paste any educational website URL
- AI analyzes the content and extracts main concepts
- Generates mind map based on the website's content structure
- Supports various content types: articles, tutorials, academic papers, etc.

### 2. Interactive Mind Map Visualization

#### Initial Mind Map Generation
- Central node displays the main topic
- 2-5 primary branches show core concepts/areas
- Visual hierarchy with clear connections
- Responsive design that works on desktop and mobile

#### Infinite Expansion Capability
- Click any bubble/node to expand it further
- Each expansion generates 2-5 sub-concepts
- No limit to depth of exploration
- Smooth animations for adding new nodes
- Color-coded levels for visual clarity

#### Mind Map Features (Svelte Flow Implementation)
- Interactive node-based visualization using Svelte Flow
- Zoom and pan functionality with smooth viewport controls
- Drag and drop node repositioning
- Custom node types for different topic categories
- Animated edge connections between related concepts
- Collapsible branch groups for complex hierarchies
- Search within the map with node highlighting
- Export capabilities (PNG, PDF)
- Shareable URLs for specific map states
- Click handlers for node interaction and expansion
- Double-click to access dedicated content pages
- Hover effects with preview tooltips
- Context menus for additional node actions

#### Interactive Node Functionality
- **Single Click**: Select node and show preview information
- **Double Click**: Navigate to dedicated content page
- **Right Click**: Context menu with expansion options
- **Hover**: Display node tooltip with summary
- **Drag**: Reposition nodes in the visualization
- **Plus Button**: Expand node to show sub-concepts
- **Connection Points**: Visual handles for relationship mapping

#### Node Content Pages
- Each bubble/node has its own dedicated page
- Detailed content exploration beyond the mind map
- Rich text content with multimedia support
- Related concept suggestions
- Deep-dive learning materials
- Interactive elements (quizzes, exercises)
- Comments and notes functionality
- Progress tracking per topic

#### Paragraph-Based Learning System
- **Granular Content Cards**: Each content section is split into focused paragraph cards
- **Individual Paragraph Tracking**: Each paragraph can be marked as read/unread
- **AI Chat Integration**: Click chat icon on any paragraph to ask specific questions
- **Context-Aware AI**: AI responses use the specific paragraph content for accuracy
- **Progress Visualization**: Section-level progress bars show reading completion
- **Q&A Storage**: All paragraph-specific questions and answers are saved
- **Reading Analytics**: Track reading patterns and comprehension progress

### 3. Source Tracking & References

#### Automatic Source Logging
- Every AI-generated expansion is backed by relevant sources
- URLs are automatically collected and stored
- Sources are linked to specific nodes/bubbles
- Quality sources prioritized (academic, educational institutions)

#### Source Management
- View all sources for any node
- Click through to original content
- Source credibility indicators
- Automatic citation generation
- Source recommendation engine

#### Reference Panel
- Sidebar showing all sources used
- Categorized by topic/node
- Direct links to source material
- Source quality ratings
- Related source suggestions

### 4. Learning Progress Tracking

#### Session History
- Save and resume exploration sessions
- Track learning paths taken
- Export learning summaries
- Share exploration journeys

#### Paragraph-Level Progress Tracking
- **Granular Reading Progress**: Track completion of individual paragraphs within each topic
- **Visual Progress Indicators**: Real-time progress bars showing section completion percentages
- **Reading State Persistence**: Mark paragraphs as read/unread with database persistence
- **Completion Analytics**: Statistics on reading patterns and comprehension progress
- **Resume Reading**: Return to exactly where you left off in any topic

#### AI-Powered Learning Assistance
- **Contextual Q&A**: Ask questions about specific paragraphs with AI responses
- **Knowledge Base Building**: Save all Q&A pairs for future reference and review
- **Comprehension Support**: Get explanations tailored to specific content pieces
- **Learning Reinforcement**: Review saved questions and answers for better retention

#### Knowledge Mapping
- Personal knowledge graphs
- Connection discovery between topics
- Learning gap identification
- Suggested next topics to explore

## Technical Architecture

### Frontend Stack
- **Framework**: SvelteKit for reactive UI and SSR
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **Mind Map**: Svelte Flow (@xyflow/svelte) for interactive node-based visualization
- **State Management**: Svelte stores for app state

### Backend & Data
- **Database**: PgLite for MVP (upgrading to PostgreSQL later)
- **AI Integration**: Genkit.dev for all AI operations
- **API**: SvelteKit API routes
- **Data Models**: Topic nodes, sources, user sessions

### Key Dependencies
- **@xyflow/svelte**: Interactive node-based mind mapping visualization
- **@genkit-ai/core**: AI workflow orchestration and content generation
- **@electric-sql/pglite**: Embedded PostgreSQL for local data storage
- **tailwindcss**: Utility-first CSS framework for responsive design

### Svelte Flow Implementation

#### Mind Map Visualization Setup
```typescript
// Svelte Flow integration
import { SvelteFlow } from '@xyflow/svelte';
import '@xyflow/svelte/dist/style.css';

// Custom node types for different topic categories
const nodeTypes = {
  topicNode: TopicNode,
  conceptNode: ConceptNode,
  detailNode: DetailNode
};

// Interactive node configuration
let nodes = $state.raw([
  {
    id: '1',
    type: 'topicNode',
    position: { x: 0, y: 0 },
    data: { 
      label: 'Main Topic',
      content: 'Topic overview...',
      expandable: true,
      sources: [...],
      level: 0
    }
  }
]);

let edges = $state.raw([
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true
  }
]);
```

#### Custom Node Components
```typescript
// TopicNode.svelte - Interactive custom node
<script>
  export let data;
  export let id;
  
  function handleNodeClick() {
    // Navigate to content page
    goto(`/topic/${id}`);
  }
  
  function handleExpand() {
    // Trigger AI expansion
    expandNode(id, data.label);
  }
</script>

<div class="topic-node" on:click={handleNodeClick}>
  <Handle type="target" position="top" />
  <div class="node-content">
    <h3>{data.label}</h3>
    <p>{data.preview}</p>
    {#if data.expandable}
      <button on:click|stopPropagation={handleExpand} class="expand-btn">
        +
      </button>
    {/if}
  </div>
  <Handle type="source" position="bottom" />
</div>
```

### AI Implementation (Genkit.dev)

#### Content Analysis Flow
```typescript
// Topic breakdown flow
const topicBreakdown = await genkit.generate({
  model: 'gemini-2.5-flash',
  prompt: `Analyze "${topic}" and break it down into 2-5 core concepts...`,
  schema: TopicBreakdownSchema
});

// URL content extraction flow  
const urlAnalysis = await genkit.generate({
  model: 'gemini-2.5-flash',
  prompt: `Extract main concepts from this content: ${urlContent}`,
  schema: ConceptExtractionSchema
});

// Content page generation flow
const contentPage = await genkit.generate({
  model: 'gemini-2.5-flash',
  prompt: `Generate comprehensive educational content for "${concept}" including overview, detailed explanation, real-world examples, and practical applications...`,
  schema: ContentPageSchema
});
```

#### Source Discovery
- AI finds relevant educational sources for each concept
- Quality filtering for academic and educational content
- Real-time source validation and accessibility checking

### Database Schema

#### Topics Table
```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_overview TEXT,
  content_details TEXT,
  content_examples TEXT,
  content_applications TEXT,
  parent_id UUID REFERENCES topics(id),
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  session_id UUID NOT NULL
);
```

#### Sources Table  
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY,
  url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  credibility_score INTEGER,
  topic_id UUID REFERENCES topics(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_identifier VARCHAR(255),
  root_topic VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);
```

#### Content Progress Table
```sql
CREATE TABLE content_progress (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  session_id UUID REFERENCES sessions(id),
  section_completed VARCHAR(50), -- 'overview', 'details', 'examples', 'applications'
  completion_percentage INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

#### Paragraph Progress Table
```sql
CREATE TABLE paragraph_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  paragraph_id TEXT NOT NULL,
  paragraph_hash TEXT NOT NULL, -- Content hash for consistency
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, topic_id, section_id, paragraph_id)
);
```

#### Paragraph Q&A Table
```sql
CREATE TABLE paragraph_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  topic_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  paragraph_id TEXT NOT NULL,
  paragraph_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  ai_model TEXT DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## User Experience Flow

### 1. Landing Page
- Clean, minimal design
- Two prominent input options:
  - Text input for topics
  - URL input for website analysis
- Recent explorations (if any)
- Featured topic suggestions

### 2. Topic Processing
- Loading animation while AI processes input
- Progress indicators for different stages:
  - Content analysis
  - Concept extraction  
  - Source discovery
  - Mind map generation

### 3. Mind Map Interface (Svelte Flow)
- Center-focused initial view with smooth viewport controls
- Interactive Svelte Flow nodes with custom styling
- Drag and drop node repositioning for better organization
- Intuitive click interactions for node selection and data access
- Hover effects showing detailed preview tooltips
- Right-click context menus for expansion and navigation options
- Double-click to open dedicated content pages
- Animated edge connections with smooth transitions
- Zoom controls and minimap for large concept networks
- Breadcrumb navigation for deep exploration paths

### 3.5. Node Content Pages
- Full-screen dedicated page for each concept
- AI-generated comprehensive content
- Multiple content sections: overview, details, examples, applications
- Embedded media (images, videos, diagrams)
- Interactive learning elements
- Navigation back to mind map with highlighted current node
- Related concepts sidebar
- Progress indicators for content completion

#### Paragraph-Based Content Experience
- **Individual Paragraph Cards**: Content displayed as digestible, focused cards
- **Interactive Reading Progress**: Checkmark buttons for marking paragraphs as read
- **Hover-Activated Chat**: Chat icons appear on hover for paragraph-specific questions
- **AI Chat Drawer**: Slide-out panel for contextual Q&A about specific paragraphs
- **Visual Progress Feedback**: Green highlighting for completed paragraphs
- **Section Progress Bars**: Real-time completion indicators for each content section
- **Saved Q&A History**: Access to all previously asked questions and AI responses
- **Resume Reading Flow**: Visual indicators for where you left off

### 4. Expansion Workflow
- Click any node to reveal expansion options
- AI generates relevant sub-concepts
- New nodes animate into view
- Source panel updates with new references

### 5. Source Integration
- Floating source indicators on nodes
- Click to view source details
- Quick preview of source content
- External link handling

## MVP Scope

### Phase 1 Features (MVP)
- [x] Svelte Flow integration for interactive mind mapping
- [x] Custom node components with click handlers
- [x] Basic topic input and mind map generation
- [x] URL content extraction and analysis
- [x] 3-level deep exploration capability
- [x] Interactive node functionality (click, hover, expand)
- [x] Dedicated content pages for each node/bubble
- [x] Basic AI-generated content sections (overview, details)
- [x] Navigation between mind map and content pages
- [x] Basic source tracking and display
- [x] Simple session persistence with PgLite
- [x] Responsive design for desktop and mobile

#### ✨ New: Paragraph-Based Learning Features (Implemented)
- [x] **Granular Content Cards**: Content split into focused paragraph cards
- [x] **Individual Progress Tracking**: Mark each paragraph as read/unread
- [x] **AI Chat Integration**: Ask questions about specific paragraphs
- [x] **Context-Aware Responses**: AI uses paragraph content for accurate answers
- [x] **Q&A Storage System**: Save and retrieve paragraph-specific questions
- [x] **Visual Progress Indicators**: Section-level progress bars and completion stats
- [x] **Reading State Persistence**: Database-backed progress tracking
- [x] **Interactive Learning Interface**: Hover effects, chat drawers, and smooth UX

### Phase 2 Features
- [ ] Advanced Svelte Flow features (minimap, controls panel)
- [ ] Infinite expansion depth with dynamic node loading
- [ ] Advanced node styling and animations
- [ ] Node clustering and grouping functionality
- [ ] Advanced source quality filtering
- [ ] Enhanced content pages with examples and applications sections
- [ ] Interactive learning elements (quizzes, exercises)
- [ ] Content progress tracking and analytics
- [ ] User accounts and saved explorations
- [ ] Mind map export functionality (PNG, PDF, JSON)
- [ ] Search within mind maps with result highlighting
- [ ] PostgreSQL migration

### Phase 3 Features
- [ ] Collaborative exploration sessions
- [ ] Learning path recommendations
- [ ] Integration with educational platforms
- [ ] Advanced analytics and insights
- [ ] API for third-party integrations

## Performance Requirements

### Response Times
- Initial topic breakdown: < 3 seconds
- Node expansion: < 2 seconds
- Source discovery: < 1 second (background)
- Mind map rendering: < 500ms

### Scalability
- Support for 100+ nodes per session
- 50+ concurrent users (MVP)
- Efficient caching for repeated queries
- Progressive loading for large mind maps

## Quality Assurance

### AI Quality Control
- Source credibility verification
- Content relevance scoring
- Factual accuracy checking
- Bias detection and mitigation

### User Experience Testing
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility compliance (WCAG 2.1)
- Performance optimization

## Future Enhancements

### Advanced AI Features
- Multi-language support
- Voice input for topics
- Image-based topic extraction
- Personalized learning recommendations

### Social Features
- Share exploration sessions
- Collaborative mind mapping
- Community-contributed content
- Teacher/student classroom integration

### Educational Integrations
- LMS compatibility
- Assignment generation
- Progress tracking for educators
- Curriculum alignment tools

## Success Metrics

### User Engagement
- Average session duration: > 10 minutes
- Node expansion rate: > 5 expansions per session
- Return user rate: > 30%
- Source link click-through rate: > 20%

### Learning Effectiveness  
- User comprehension improvement
- Topic exploration depth
- Source diversity utilization
- Knowledge retention tracking

---

*This document serves as the foundational specification for Explore.fyi. It will be updated as features are implemented and user feedback is incorporated.*
