/**
 * Session Store
 * Manages user session state with cloud persistence via Supabase
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { SessionService } from '$lib/database/sessions.js';

interface SessionState {
  id: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  settings: Record<string, any>;
  lastActivity: string | null;
  topicCount: number;
  error: string | null;
}

interface SessionStats {
  totalTopics: number;
  totalTimeSpent: number;
  recentTopics: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
}

// Initial state
const initialState: SessionState = {
  id: null,
  isLoading: false,
  isInitialized: false,
  settings: {},
  lastActivity: null,
  topicCount: 0,
  error: null
};

// Create the main session store
function createSessionStore() {
  const { subscribe, set, update } = writable<SessionState>(initialState);

  return {
    subscribe,
    
    /**
     * Initialize session - create new or restore existing
     */
    async initialize(): Promise<void> {
      if (!browser) return;

      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        // Check for existing session ID in localStorage
        const existingSessionId = localStorage.getItem('explore_session_id');
        
        if (existingSessionId) {
          // Try to restore existing session
          const session = await SessionService.getSession(existingSessionId);
          
          if (session) {
            // Update activity timestamp
            await SessionService.updateSessionActivity(existingSessionId);
            
            update(state => ({
              ...state,
              id: session.id,
              settings: session.settings || {},
              lastActivity: session.last_activity,
              topicCount: session.topic_count,
              isLoading: false,
              isInitialized: true
            }));
            
            console.log('Restored existing session:', session.id);
            return;
          } else {
            // Session not found in database, clear localStorage
            localStorage.removeItem('explore_session_id');
          }
        }

        // Create new anonymous session
        const newSession = await SessionService.createAnonymousSession({
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        });

        // Store session ID in localStorage
        localStorage.setItem('explore_session_id', newSession.id);

        update(state => ({
          ...state,
          id: newSession.id,
          settings: newSession.settings || {},
          lastActivity: newSession.last_activity,
          topicCount: newSession.topic_count,
          isLoading: false,
          isInitialized: true
        }));

        console.log('Created new session:', newSession.id);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        update(state => ({
          ...state,
          isLoading: false,
          isInitialized: true,
          error: error instanceof Error ? error.message : 'Session initialization failed'
        }));
      }
    },

    /**
     * Update session activity (call periodically)
     */
    async updateActivity(): Promise<void> {
      const state = get({ subscribe });
      if (!state.id) return;

      try {
        await SessionService.updateSessionActivity(state.id);
        update(s => ({ ...s, lastActivity: new Date().toISOString() }));
      } catch (error) {
        console.error('Failed to update session activity:', error);
      }
    },

    /**
     * Update session settings
     */
    async updateSettings(newSettings: Record<string, any>): Promise<void> {
      const state = get({ subscribe });
      if (!state.id) return;

      try {
        await SessionService.updateSessionSettings(state.id, newSettings);
        update(s => ({ ...s, settings: newSettings }));
      } catch (error) {
        console.error('Failed to update session settings:', error);
        update(s => ({ ...s, error: 'Failed to update settings' }));
      }
    },

    /**
     * Increment topic count when user explores a new topic
     */
    async incrementTopicCount(): Promise<void> {
      const state = get({ subscribe });
      if (!state.id) return;

      try {
        await SessionService.incrementTopicCount(state.id);
        update(s => ({ ...s, topicCount: s.topicCount + 1 }));
      } catch (error) {
        console.error('Failed to increment topic count:', error);
      }
    },

    /**
     * Get session statistics
     */
    async getStats(): Promise<SessionStats | null> {
      const state = get({ subscribe });
      if (!state.id) return null;

      try {
        const stats = await SessionService.getSessionStats(state.id);
        if (!stats) return null;

        return {
          totalTopics: stats.topic_count,
          totalTimeSpent: stats.total_time_spent_seconds,
          recentTopics: stats.recent_topics.map((topic: any) => ({
            id: topic.id,
            title: topic.title,
            created_at: topic.created_at
          }))
        };
      } catch (error) {
        console.error('Failed to get session stats:', error);
        return null;
      }
    },

    /**
     * Reset session store to initial state
     */
    reset(): void {
      set(initialState);
      if (browser) {
        localStorage.removeItem('explore_session_id');
      }
    },

    /**
     * Clear any errors
     */
    clearError(): void {
      update(state => ({ ...state, error: null }));
    }
  };
}

// Create the session store instance
export const session = createSessionStore();

// Derived stores for common computed values
export const isSessionReady = derived(
  session,
  $session => $session.isInitialized && $session.id !== null && !$session.isLoading
);

export const sessionId = derived(
  session,
  $session => $session.id
);

export const sessionSettings = derived(
  session,
  $session => $session.settings
);

// Activity tracking setup
if (browser) {
  let activityTimer: number | null = null;
  
  // Update activity every 30 seconds
  const startActivityTracking = () => {
    if (activityTimer) return;
    
    activityTimer = window.setInterval(() => {
      session.updateActivity();
    }, 30000); // 30 seconds
  };

  const stopActivityTracking = () => {
    if (activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }
  };

  // Start activity tracking when session is ready
  isSessionReady.subscribe(ready => {
    if (ready) {
      startActivityTracking();
    } else {
      stopActivityTracking();
    }
  });

  // Track user interactions
  const trackUserActivity = () => {
    session.updateActivity();
  };

  // Listen for user interactions
  document.addEventListener('click', trackUserActivity);
  document.addEventListener('keypress', trackUserActivity);
  document.addEventListener('scroll', trackUserActivity);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopActivityTracking();
    session.updateActivity(); // Final activity update
  });
}

export default session;
