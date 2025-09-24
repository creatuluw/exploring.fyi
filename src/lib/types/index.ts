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

// New AI API response types
export interface TopicBreakdown {
  mainTopic: string;
  description: string;
  keyAspects: Array<{
    name: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    connections: string[];
  }>;
  learningPath: Array<{
    step: number;
    concept: string;
    prerequisites: string[];
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
}

export interface ConceptExpansion {
  concept: string;
  subConcepts: Array<{
    name: string;
    description: string;
    examples: string[];
    relatedTo: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  practicalApplications: string[];
  commonMisconceptions: string[];
  resources: Array<{
    type: 'article' | 'video' | 'book' | 'course' | 'documentation';
    title: string;
    url?: string;
    description: string;
  }>;
}

export interface NewUrlAnalysis {
  title: string;
  domain: string;
  contentType: 'article' | 'documentation' | 'tutorial' | 'research' | 'news' | 'blog' | 'other';
  summary: string;
  keyTopics: string[];
  concepts: Array<{
    name: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  credibility: {
    score: number;
    factors: string[];
    warnings: string[];
  };
  relatedTopics: string[];
}

// Enhanced Content Generation Types
export interface DetailedContentPage {
  id: string;
  topic: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
  lastUpdated: Date;
  sections: DetailedContentSection[];
  relatedTopics: RelatedTopic[];
  sources: SourceSuggestion[];
  learningObjectives: string[];
  prerequisites: string[];
  nextSteps: string[];
}

export interface DetailedContentSection {
  id: string;
  title: string;
  content: string;
  type: 'introduction' | 'explanation' | 'example' | 'application' | 'summary';
  order: number;
  subsections?: ContentSubsection[];
  codeExamples?: CodeExample[];
  visualAids?: VisualAid[];
}

export interface ContentSubsection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface CodeExample {
  id: string;
  language: string;
  code: string;
  description: string;
  output?: string;
}

export interface VisualAid {
  id: string;
  type: 'diagram' | 'chart' | 'image' | 'video';
  url?: string;
  description: string;
  altText: string;
}

export interface RelatedTopic {
  id: string;
  name: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  connectionType: 'prerequisite' | 'related' | 'advanced' | 'application';
}

export interface SourceSuggestion {
  id: string;
  title: string;
  url: string;
  type: 'article' | 'video' | 'book' | 'course' | 'documentation' | 'research';
  credibility: 'high' | 'medium' | 'low';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  author?: string;
  publishDate?: Date;
  domain: string;
  estimatedTime?: string;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  type: 'interactive' | 'practice' | 'quiz' | 'project' | 'tutorial';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  url?: string;
  content?: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
}

// Normalized ToC types (Chapters & Paragraphs)
export interface ChapterRecord {
  id: string;
  topicId: string;
  index: number; // 1-based order within topic
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ParagraphRecord {
  id: string;
  topicId: string;
  chapterId: string;
  index: number; // 1-based order within chapter
  content?: string; // present when generated
  summary?: string;
  metadata?: Record<string, any>;
  isGenerated: boolean;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterWithParagraphs extends ChapterRecord {
  paragraphs: ParagraphRecord[];
}

// Chapter check types
export interface ChapterCheckQuestion {
  id: string;
  text: string;
}

export interface ChapterCheckAnswer {
  questionId: string;
  userAnswer: string;
}

export interface ChapterCheckAttempt {
  id: string;
  sessionId: string;
  topicId: string;
  chapterId: string;
  questions: ChapterCheckQuestion[];
  answers: ChapterCheckAnswer[];
  aiFeedback?: Record<string, any>;
  score: number; // 1-10
  model?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}