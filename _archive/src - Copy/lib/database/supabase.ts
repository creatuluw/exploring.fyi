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
          topic_count: number;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          settings?: Record<string, any> | null;
          last_activity?: string;
          created_at?: string;
          topic_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          settings?: Record<string, any> | null;
          last_activity?: string;
          created_at?: string;
          topic_count?: number;
        };
      };
      topics: {
        Row: {
          id: string;
          session_id: string;
          title: string;
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
          nodes: Record<string, any>[];
          edges: Record<string, any>[];
          layout_data: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          nodes: Record<string, any>[];
          edges: Record<string, any>[];
          layout_data?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
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
          topic_id: string;
          url: string;
          title: string;
          credibility_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          url: string;
          title: string;
          credibility_score: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          url?: string;
          title?: string;
          credibility_score?: number;
          created_at?: string;
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
   * Generate a deterministic topic ID based on composite key of title and user identifier
   * This ensures same topic for same user always gets same ID, preventing duplicates
   */
  generateTopicId: async (title: string, userIdentifier: string): Promise<string> => {
    // Normalize the title (trim, lowercase, remove extra spaces)
    const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Create composite key
    const compositeKey = `${normalizedTitle}||${userIdentifier}`;
    
    // Generate deterministic hash using SubtleCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(compositeKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as UUID-like string for compatibility
    const uuid = [
      hashHex.slice(0, 8),
      hashHex.slice(8, 12),
      hashHex.slice(12, 16),
      hashHex.slice(16, 20),
      hashHex.slice(20, 32)
    ].join('-');
    
    return uuid;
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
  }
};

export default supabase;
