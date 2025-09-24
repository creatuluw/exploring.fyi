/**
 * Enhanced Progress Tracking Service
 * Tracks detailed user engagement and learning analytics
 */

import { ProgressService } from '$lib/database/progress.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

interface EngagementEvent {
  type: 'page_view' | 'node_click' | 'expansion' | 'content_scroll' | 'section_complete' | 'time_spent';
  topicId: string;
  sectionId?: string;
  nodeId?: string;
  data?: Record<string, any>;
  timestamp: string;
}

class ProgressTracker {
  private events: EngagementEvent[] = [];
  private startTime: number = 0;
  private currentTopic: string | null = null;
  private currentSection: string | null = null;
  private scrollProgress: number = 0;
  private sessionStorage: Map<string, any> = new Map();

  /**
   * Start tracking for a topic
   */
  async startTopicTracking(topicId: string): Promise<void> {
    console.log(`📊 [Progress] Starting tracking for topic: ${topicId}`);
    
    this.currentTopic = topicId;
    this.startTime = Date.now();
    
    await this.trackEvent({
      type: 'page_view',
      topicId,
      data: {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track node interactions
   */
  async trackNodeClick(topicId: string, nodeId: string, nodeData?: any): Promise<void> {
    await this.trackEvent({
      type: 'node_click',
      topicId,
      nodeId,
      data: {
        nodeLabel: nodeData?.label,
        nodeType: nodeData?.type,
        level: nodeData?.level
      }
    });
  }

  /**
   * Track concept expansions
   */
  async trackConceptExpansion(topicId: string, nodeId: string, expansionData?: any): Promise<void> {
    await this.trackEvent({
      type: 'expansion',
      topicId,
      nodeId,
      data: {
        concept: expansionData?.concept,
        newNodesCount: expansionData?.newNodes?.length || 0,
        newEdgesCount: expansionData?.newEdges?.length || 0
      }
    });
  }

  /**
   * Track content reading progress
   */
  async trackContentProgress(
    topicId: string, 
    sectionId: string, 
    progressPercentage: number
  ): Promise<void> {
    const sessionState = get(session);
    if (!sessionState.id) return;

    try {
      // Update database
      await ProgressService.trackContentProgress(
        sessionState.id,
        topicId,
        sectionId,
        progressPercentage
      );

      // Track event
      await this.trackEvent({
        type: 'content_scroll',
        topicId,
        sectionId,
        data: { progressPercentage }
      });

      this.scrollProgress = progressPercentage;
      this.currentSection = sectionId;

    } catch (error) {
      console.error('Failed to track content progress:', error);
    }
  }

  /**
   * Track time spent on content
   */
  async trackTimeSpent(topicId: string, sectionId: string, additionalSeconds: number): Promise<void> {
    const sessionState = get(session);
    if (!sessionState.id) return;

    try {
      await ProgressService.updateTimeSpent(
        sessionState.id,
        topicId,
        sectionId,
        additionalSeconds
      );

      await this.trackEvent({
        type: 'time_spent',
        topicId,
        sectionId,
        data: { additionalSeconds, totalTimeMs: Date.now() - this.startTime }
      });

    } catch (error) {
      console.error('Failed to track time spent:', error);
    }
  }

  /**
   * Mark section as complete
   */
  async completeSection(topicId: string, sectionId: string): Promise<void> {
    const sessionState = get(session);
    if (!sessionState.id) return;

    try {
      await ProgressService.markSectionComplete(sessionState.id, topicId, sectionId);

      await this.trackEvent({
        type: 'section_complete',
        topicId,
        sectionId,
        data: { 
          completedAt: new Date().toISOString(),
          timeToComplete: Date.now() - this.startTime
        }
      });

      console.log(`✅ [Progress] Section completed: ${sectionId}`);

    } catch (error) {
      console.error('Failed to mark section complete:', error);
    }
  }

  /**
   * Get progress summary for current session
   */
  async getProgressSummary(): Promise<any> {
    const sessionState = get(session);
    if (!sessionState.id) return null;

    try {
      return await ProgressService.getProgressSummary(sessionState.id);
    } catch (error) {
      console.error('Failed to get progress summary:', error);
      return null;
    }
  }

  /**
   * Get topic-specific progress
   */
  async getTopicProgress(topicId: string): Promise<any> {
    const sessionState = get(session);
    if (!sessionState.id) return null;

    try {
      return await ProgressService.getTopicProgress(sessionState.id, topicId);
    } catch (error) {
      console.error('Failed to get topic progress:', error);
      return null;
    }
  }

  /**
   * Get learning analytics
   */
  async getLearningAnalytics(): Promise<any> {
    const sessionState = get(session);
    if (!sessionState.id) return null;

    try {
      return await ProgressService.getLearningAnalytics(sessionState.id);
    } catch (error) {
      console.error('Failed to get learning analytics:', error);
      return null;
    }
  }

  /**
   * Private method to track events
   */
  private async trackEvent(event: Omit<EngagementEvent, 'timestamp'>): Promise<void> {
    const fullEvent: EngagementEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.events.push(fullEvent);
    
    // Store locally for offline support
    this.sessionStorage.set(`event_${Date.now()}`, fullEvent);
    
    console.log(`📊 [Progress] Event tracked:`, fullEvent);
  }

  /**
   * Flush events (for cleanup)
   */
  flush(): void {
    this.events = [];
    this.sessionStorage.clear();
    this.currentTopic = null;
    this.currentSection = null;
    this.startTime = 0;
    this.scrollProgress = 0;
  }
}

// Create singleton instance
export const progressTracker = new ProgressTracker();

/**
 * Setup automatic scroll tracking for content pages
 */
export function setupScrollTracking(topicId: string, sectionId: string): () => void {
  if (!browser) return () => {};

  let ticking = false;
  let lastUpdateTime = Date.now();
  const UPDATE_INTERVAL = 2000; // Update every 2 seconds

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const now = Date.now();
        
        // Calculate scroll progress
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(100, Math.max(0, (scrollTop / documentHeight) * 100));

        // Update progress if significant change or enough time passed
        if (now - lastUpdateTime > UPDATE_INTERVAL) {
          progressTracker.trackContentProgress(topicId, sectionId, progress);
          lastUpdateTime = now;
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  // Setup time tracking
  const timeTrackingInterval = setInterval(() => {
    progressTracker.trackTimeSpent(topicId, sectionId, 5); // 5 seconds
  }, 5000);

  // Add scroll listener
  window.addEventListener('scroll', handleScroll);

  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
    clearInterval(timeTrackingInterval);
  };
}

/**
 * Setup automatic node interaction tracking
 */
export function setupNodeTracking(topicId: string) {
  return {
    trackClick: (nodeId: string, nodeData?: any) => 
      progressTracker.trackNodeClick(topicId, nodeId, nodeData),
    
    trackExpansion: (nodeId: string, expansionData?: any) => 
      progressTracker.trackConceptExpansion(topicId, nodeId, expansionData)
  };
}

export default progressTracker;
