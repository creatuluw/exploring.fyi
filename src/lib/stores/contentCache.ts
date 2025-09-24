/**
 * Content Cache Store
 * Manages topic content with localStorage persistence and background sync
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { ChapterWithParagraphs, ParagraphRecord } from '$lib/types/index.js';

interface TopicContent {
  topicId: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  context?: string;
  enhancedContext?: any;
  chapters: ChapterWithParagraphs[];
  metadata: {
    generatedAt: string;
    lastAccessed: string;
    sessionId?: string;
    totalChapters: number;
    totalParagraphs: number;
  };
}

interface ContentCacheState {
  topics: Record<string, TopicContent>;
  isLoading: boolean;
  lastSyncedAt: string | null;
  pendingSync: string[]; // topic IDs that need background sync
}

const CACHE_KEY = 'exploring-fyi-content-cache';
const MAX_CACHED_TOPICS = 20; // Limit localStorage usage
const CACHE_EXPIRY_DAYS = 7; // Remove old cached content after 7 days

// Initial state
const initialState: ContentCacheState = {
  topics: {},
  isLoading: false,
  lastSyncedAt: null,
  pendingSync: []
};

// Load from localStorage
function loadCacheFromStorage(): ContentCacheState {
  if (!browser) return initialState;
  
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Clean up expired content
      const cleanedTopics: Record<string, TopicContent> = {};
      const now = new Date();
      
      Object.entries(parsed.topics || {}).forEach(([key, topic]: [string, any]) => {
        const lastAccessed = new Date(topic.metadata?.lastAccessed || 0);
        const daysSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceAccess < CACHE_EXPIRY_DAYS) {
          cleanedTopics[key] = topic;
        }
      });
      
      return {
        topics: cleanedTopics,
        isLoading: false,
        lastSyncedAt: parsed.lastSyncedAt || null,
        pendingSync: parsed.pendingSync || []
      };
    }
  } catch (error) {
    console.warn('Failed to load content cache from localStorage:', error);
  }
  
  return initialState;
}

// Save to localStorage
function saveCacheToStorage(state: ContentCacheState) {
  if (!browser) return;
  
  try {
    // Limit the number of cached topics
    const topicEntries = Object.entries(state.topics);
    if (topicEntries.length > MAX_CACHED_TOPICS) {
      // Sort by last accessed and keep only the most recent
      topicEntries.sort((a, b) => {
        const aTime = new Date(a[1].metadata.lastAccessed).getTime();
        const bTime = new Date(b[1].metadata.lastAccessed).getTime();
        return bTime - aTime; // Most recent first
      });
      
      state.topics = Object.fromEntries(topicEntries.slice(0, MAX_CACHED_TOPICS));
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save content cache to localStorage:', error);
  }
}

// Create the content cache store
function createContentCacheStore() {
  const { subscribe, set, update } = writable<ContentCacheState>(loadCacheFromStorage());

  return {
    subscribe,
    
    /**
     * Cache topic content
     */
    cacheTopicContent(
      topicId: string,
      topic: string,
      chapters: ChapterWithParagraphs[],
      options?: {
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        context?: string;
        enhancedContext?: any;
        sessionId?: string;
      }
    ): void {
      console.log(`💾 [Content Cache] Caching content for topic: ${topic}`);
      
      update(state => {
        const now = new Date().toISOString();
        
        const topicContent: TopicContent = {
          topicId,
          topic,
          difficulty: options?.difficulty || 'intermediate',
          context: options?.context,
          enhancedContext: options?.enhancedContext,
          chapters,
          metadata: {
            generatedAt: state.topics[topicId]?.metadata.generatedAt || now,
            lastAccessed: now,
            sessionId: options?.sessionId,
            totalChapters: chapters.length,
            totalParagraphs: chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
          }
        };
        
        const newState = {
          ...state,
          topics: {
            ...state.topics,
            [topicId]: topicContent
          }
        };
        
        saveCacheToStorage(newState);
        return newState;
      });
    },
    
    /**
     * Update a specific paragraph in cached content
     */
    updateCachedParagraph(
      topicId: string,
      chapterId: string,
      paragraphId: string,
      paragraphData: Partial<ParagraphRecord>
    ): void {
      console.log(`📝 [Content Cache] Updating cached paragraph: ${paragraphId}`);
      
      update(state => {
        const topic = state.topics[topicId];
        if (!topic) return state;
        
        const chapterIndex = topic.chapters.findIndex(ch => ch.id === chapterId);
        if (chapterIndex === -1) return state;
        
        const paragraphIndex = topic.chapters[chapterIndex].paragraphs.findIndex(p => p.id === paragraphId);
        if (paragraphIndex === -1) return state;
        
        const updatedChapters = [...topic.chapters];
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          paragraphs: updatedChapters[chapterIndex].paragraphs.map(p => 
            p.id === paragraphId 
              ? { ...p, ...paragraphData, updatedAt: new Date().toISOString() }
              : p
          )
        };
        
        const newState = {
          ...state,
          topics: {
            ...state.topics,
            [topicId]: {
              ...topic,
              chapters: updatedChapters,
              metadata: {
                ...topic.metadata,
                lastAccessed: new Date().toISOString()
              }
            }
          },
          pendingSync: state.pendingSync.includes(topicId) 
            ? state.pendingSync 
            : [...state.pendingSync, topicId]
        };
        
        saveCacheToStorage(newState);
        return newState;
      });
    },
    
    /**
     * Get cached topic content
     */
    getCachedTopicContent(topicId: string): TopicContent | null {
      const state = get({ subscribe });
      const topic = state.topics[topicId];
      
      if (topic) {
        console.log(`✅ [Content Cache] Found cached content for: ${topic.topic}`);
        
        // Update last accessed time
        this.updateLastAccessed(topicId);
        
        return topic;
      }
      
      console.log(`📭 [Content Cache] No cached content found for: ${topicId}`);
      return null;
    },
    
    /**
     * Update last accessed time for a topic
     */
    updateLastAccessed(topicId: string): void {
      update(state => {
        const topic = state.topics[topicId];
        if (!topic) return state;
        
        const newState = {
          ...state,
          topics: {
            ...state.topics,
            [topicId]: {
              ...topic,
              metadata: {
                ...topic.metadata,
                lastAccessed: new Date().toISOString()
              }
            }
          }
        };
        
        saveCacheToStorage(newState);
        return newState;
      });
    },
    
    /**
     * Check if topic content exists in cache
     */
    hasTopicContent(topicId: string): boolean {
      const state = get({ subscribe });
      return !!state.topics[topicId];
    },
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
      const state = get({ subscribe });
      return {
        totalTopics: Object.keys(state.topics).length,
        pendingSyncCount: state.pendingSync.length,
        lastSyncedAt: state.lastSyncedAt,
        totalParagraphs: Object.values(state.topics).reduce(
          (sum, topic) => sum + topic.metadata.totalParagraphs, 0
        )
      };
    },
    
    /**
     * Clear all cached content
     */
    clearCache(): void {
      console.log('🗑️ [Content Cache] Clearing all cached content');
      
      set(initialState);
      
      if (browser) {
        localStorage.removeItem(CACHE_KEY);
      }
    },
    
    /**
     * Mark topic for background sync
     */
    markForSync(topicId: string): void {
      update(state => {
        if (state.pendingSync.includes(topicId)) return state;
        
        const newState = {
          ...state,
          pendingSync: [...state.pendingSync, topicId]
        };
        
        saveCacheToStorage(newState);
        return newState;
      });
    },
    
    /**
     * Mark topic as synced
     */
    markAsSynced(topicId: string): void {
      update(state => {
        const newState = {
          ...state,
          pendingSync: state.pendingSync.filter(id => id !== topicId),
          lastSyncedAt: new Date().toISOString()
        };
        
        saveCacheToStorage(newState);
        return newState;
      });
    },
    
    /**
     * Get topics that need background sync
     */
    getPendingSyncTopics(): string[] {
      const state = get({ subscribe });
      return state.pendingSync;
    }
  };
}

// Create the store instance
export const contentCache = createContentCacheStore();

// Derived store for cache stats
export const cacheStats = derived(contentCache, ($cache) => ({
  totalTopics: Object.keys($cache.topics).length,
  pendingSyncCount: $cache.pendingSync.length,
  lastSyncedAt: $cache.lastSyncedAt
}));
