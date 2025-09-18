// Core types for Explore.fyi application

export interface TopicBreakdown {
  topic: string;
  concepts: Concept[];
  relationships: Relationship[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  type: 'fundamental' | 'practical' | 'advanced' | 'context';
  prerequisites: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  expanded?: boolean;
  subConcepts?: Concept[];
}

export interface Relationship {
  from: string;
  to: string;
  type: 'prerequisite' | 'related' | 'builds-on' | 'example-of';
  strength: number; // 0-1
}

export interface ContentPage {
  conceptId: string;
  title: string;
  overview: string;
  sections: ContentSection[];
  sources: Source[];
  relatedConcepts: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedReadTime: number;
}

export interface ContentSection {
  id: string;
  title: string;
  content: string;
  type: 'explanation' | 'example' | 'practice' | 'summary';
  media?: MediaItem[];
}

export interface MediaItem {
  type: 'image' | 'video' | 'diagram' | 'code';
  url: string;
  caption?: string;
  alt?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  domain: string;
  credibilityScore: number; // 0-1
  type: 'article' | 'video' | 'documentation' | 'tutorial' | 'academic' | 'discussion';
  extractedAt: string;
  relevanceScore: number; // 0-1
}

export interface Session {
  id: string;
  startTopic: string;
  createdAt: string;
  lastAccessedAt: string;
  progress: TopicProgress[];
  totalTimeSpent: number;
}

export interface TopicProgress {
  conceptId: string;
  visited: boolean;
  timeSpent: number;
  completed: boolean;
  notes?: string;
}

export interface UrlAnalysis {
  url: string;
  title: string;
  description: string;
  mainTopic: string;
  concepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  credibilityScore: number;
  extractedContent: string;
}

// Mind map specific types
export interface MindMapNode {
  id: string;
  type: 'topic' | 'concept';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    difficulty?: number;
    expanded?: boolean;
    conceptId?: string;
  };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  data: {
    relationshipType: Relationship['type'];
    strength: number;
  };
}

// AI service interfaces
export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  includeSources?: boolean;
  depth?: 'shallow' | 'medium' | 'deep';
}
