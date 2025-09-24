/**
 * Supabase Client Configuration
 * Connects to Railway-deployed Supabase instance
 */

import { createClient } from '@supabase/supabase-js';

// Database schema types for type safety
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          user_id: string | null;
          settings: Record<string, any> | null;
          last_activity: string;
          created_at: string;
          updated_at: string;
          topic_count: number;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          settings?: Record<string, any> | null;
          last_activity?: string;
          created_at?: string;
          updated_at?: string;
          topic_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          settings?: Record<string, any> | null;
          last_activity?: string;
          created_at?: string;
          updated_at?: string;
          topic_count?: number;
        };
      };
      topics: {
        Row: {
          id: string;
          session_id: string;
          title: string;
          slug: string;
          source_url: string | null;
          source_type: 'topic' | 'url';
          mind_map_data: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          title: string;
          slug?: string;
          source_url?: string | null;
          source_type: 'topic' | 'url';
          mind_map_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          title?: string;
          slug?: string;
          source_url?: string | null;
          source_type?: 'topic' | 'url';
          mind_map_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      mind_maps: {
        Row: {
          id: string;
          topic_id: string;
          slug: string;
          nodes: Record<string, any>[];
          edges: Record<string, any>[];
          layout_data: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          slug?: string;
          nodes: Record<string, any>[];
          edges: Record<string, any>[];
          layout_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          slug?: string;
          nodes?: Record<string, any>[];
          edges?: Record<string, any>[];
          layout_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          topic_id: string; // References topics.id (UUID)
          url: string;
          title: string | null;
          content: string | null;
          metadata: Record<string, any> | null;
          analysis_data: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          url: string;
          title?: string | null;
          content?: string | null;
          metadata?: Record<string, any> | null;
          analysis_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          url?: string;
          title?: string | null;
          content?: string | null;
          metadata?: Record<string, any> | null;
          analysis_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_progress: {
        Row: {
          id: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          progress_percentage: number;
          time_spent_seconds: number;
          completed: boolean;
          last_viewed: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          progress_percentage?: number;
          time_spent_seconds?: number;
          completed?: boolean;
          last_viewed?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          topic_id?: string;
          section_id?: string;
          progress_percentage?: number;
          time_spent_seconds?: number;
          completed?: boolean;
          last_viewed?: string;
          created_at?: string;
        };
      };
      paragraph_progress: {
        Row: {
          id: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          paragraph_id: string;
          paragraph_hash: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          paragraph_id: string;
          paragraph_hash: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          topic_id?: string;
          section_id?: string;
          paragraph_id?: string;
          paragraph_hash?: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      paragraph_qa: {
        Row: {
          id: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          paragraph_id: string;
          paragraph_hash: string;
          question: string;
          answer: string;
          ai_model: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          topic_id: string;
          section_id: string;
          paragraph_id: string;
          paragraph_hash: string;
          question: string;
          answer: string;
          ai_model?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          topic_id?: string;
          section_id?: string;
          paragraph_id?: string;
          paragraph_hash?: string;
          question?: string;
          answer?: string;
          ai_model?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string; // Format: "topic-slug-chapter-1"
          topic_id: string; // Format: "topic-slug"
          session_id: string; // UUID string
          index: number;
          title: string;
          description: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required - we generate this manually
          topic_id: string;
          session_id: string; // UUID string
          index: number;
          title: string;
          description?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          session_id?: string; // UUID string
          index?: number;
          title?: string;
          description?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      paragraphs: {
        Row: {
          id: string; // Format: "topic-slug-chapter-1-paragraph-1"
          topic_id: string; // Format: "topic-slug"
          chapter_id: string; // Format: "topic-slug-chapter-1"
          session_id: string; // UUID string
          index: number;
          content: string | null;
          summary: string | null;
          metadata: Record<string, any> | null;
          is_generated: boolean;
          generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required - we generate this manually
          topic_id: string;
          chapter_id: string;
          session_id: string; // UUID string
          index: number;
          content?: string | null;
          summary?: string | null;
          metadata?: Record<string, any> | null;
          is_generated?: boolean;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          chapter_id?: string;
          session_id?: string; // UUID string
          index?: number;
          content?: string | null;
          summary?: string | null;
          metadata?: Record<string, any> | null;
          is_generated?: boolean;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checks_done: {
        Row: {
          id: string; // Format: "topic-slug-chapter-1-check-timestamp"
          session_id: string; // UUID string
          topic_id: string; // Format: "topic-slug"
          chapter_id: string; // Format: "topic-slug-chapter-1"
          questions: Record<string, any>;
          answers: Record<string, any>;
          ai_feedback: Record<string, any> | null;
          score: number;
          model: string | null;
          duration_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required - we generate this manually
          session_id: string; // UUID string
          topic_id: string;
          chapter_id: string;
          questions: Record<string, any>;
          answers: Record<string, any>;
          ai_feedback?: Record<string, any> | null;
          score: number;
          model?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string; // UUID string
          topic_id?: string;
          chapter_id?: string;
          questions?: Record<string, any>;
          answers?: Record<string, any>;
          ai_feedback?: Record<string, any> | null;
          score?: number;
          model?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      toc: {
        Row: {
          id: string; // Format: "topic-slug"
          topic_id: string; // Format: "topic-slug" (same as id)
          session_id: string; // UUID string
          title: string;
          description: string | null;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_time_minutes: number;
          total_chapters: number;
          total_paragraphs: number;
          ai_model: string | null;
          generation_options: Record<string, any> | null;
          metadata: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // Required - we generate this manually
          topic_id: string;
          session_id: string; // UUID string
          title: string;
          description?: string | null;
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_time_minutes?: number;
          total_chapters?: number;
          total_paragraphs?: number;
          ai_model?: string | null;
          generation_options?: Record<string, any> | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          session_id?: string; // UUID string
          title?: string;
          description?: string | null;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          estimated_time_minutes?: number;
          total_chapters?: number;
          total_paragraphs?: number;
          ai_model?: string | null;
          generation_options?: Record<string, any> | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_generations: {
        Row: {
          id: string;
          topic_id: string;
          content_type: 'analysis' | 'expansion' | 'content_page';
          input_data: Record<string, any>;
          generated_content: Record<string, any> | null;
          processing_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          content_type: 'analysis' | 'expansion' | 'content_page';
          input_data: Record<string, any>;
          generated_content?: Record<string, any> | null;
          processing_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          content_type?: 'analysis' | 'expansion' | 'content_page';
          input_data?: Record<string, any>;
          generated_content?: Record<string, any> | null;
          processing_time_ms?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

// Create Supabase client with Railway configuration
const supabaseUrl = 'https://kong-production-5096.up.railway.app';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU4MTQ2NDAwLCJleHAiOjE5MTU5MTI4MDB9.sXg_gQBIBTEy_P1a07IBx1nS5db5qpPYMxVZA5oDDeQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Accept-Profile': 'public'
    }
  }
});

// Helper functions for database operations
export const dbHelpers = {
  /**
   * Generate a new UUID for database records
   */
  generateId: (): string => {
    return crypto.randomUUID();
  },

  /**
   * Generate a slug from a title
   */
  generateSlug: (title: string): string => {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Check if a topic slug already exists in the database for a session
   */
  topicSlugExists: async (sessionId: string, slug: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('id')
        .eq('session_id', sessionId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.warn('Error checking topic slug existence:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.warn('Error checking topic slug existence:', error);
      return false;
    }
  },

  /**
   * Generate a unique topic slug for a session
   */
  generateUniqueTopicSlug: async (sessionId: string, title: string): Promise<string> => {
    const baseSlug = dbHelpers.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Check if the base slug already exists
    while (await dbHelpers.topicSlugExists(sessionId, slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  },

  /**
   * Generate a chapter ID based on topic slug and chapter index
   * Format: "topic_slug-chapter-index"
   */
  generateChapterId: (topicSlug: string, chapterIndex: number): string => {
    return `${topicSlug}-chapter-${chapterIndex}`;
  },

  /**
   * Generate a paragraph ID based on chapter and paragraph index
   * Format: "topic_slug-chapter-index-paragraph-index"
   */
  generateParagraphId: (chapterId: string, paragraphIndex: number): string => {
    return `${chapterId}-paragraph-${paragraphIndex}`;
  },

  /**
   * Generate a check ID based on chapter and timestamp
   * Format: "chapter_id-check-timestamp"
   */
  generateCheckId: (chapterId: string): string => {
    const timestamp = Date.now().toString();
    return `${chapterId}-check-${timestamp}`;
  },

  /**
   * Extract topic slug from chapter or paragraph ID
   */
  extractTopicSlug: (id: string): string => {
    // For IDs like "frontend-development-chapter-1" or "frontend-development-chapter-1-paragraph-2"
    const parts = id.split('-');
    const chapterIndex = parts.findIndex(part => part === 'chapter');
    return parts.slice(0, chapterIndex).join('-');
  },

  /**
   * Handle database errors with user-friendly messages
   */
  handleError: (error: any): never => {
    console.error('Database error:', error);
    throw new Error(error.message || 'Database operation failed');
  },

  /**
   * Check if database connection is healthy
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('sessions').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Get topic by slug from a specific session
   */
  async getTopicBySlug(sessionId: string, slug: string): Promise<Database['public']['Tables']['topics']['Row'] | null> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('session_id', sessionId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.warn('Error getting topic by slug:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error getting topic by slug:', error);
      return null;
    }
  },

  /**
   * Get mindmap by slug
   */
  async getMindMapBySlug(slug: string): Promise<Database['public']['Tables']['mind_maps']['Row'] | null> {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.warn('Error getting mindmap by slug:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error getting mindmap by slug:', error);
      return null;
    }
  },

  /**
   * Generate unique mindmap slug based on topic slug
   */
  async generateUniqueMindMapSlug(topicSlug: string): Promise<string> {
    const baseSlug = `${topicSlug}-mindmap`;
    let slug = baseSlug;
    let counter = 1;

    // Check if the base slug already exists
    while (await dbHelpers.mindMapSlugExists(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  },

  /**
   * Check if a mindmap slug already exists in the database
   */
  async mindMapSlugExists(slug: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.warn('Error checking mindmap slug existence:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.warn('Error checking mindmap slug existence:', error);
      return false;
    }
  },

  /**
   * Generate mindmap slug from topic slug (helper function)
   */
  generateMindMapSlug: (topicSlug: string): string => {
    return `${topicSlug}-mindmap`;
  }
};

export default supabase;
