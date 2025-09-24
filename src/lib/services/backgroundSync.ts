/**
 * Background Sync Service
 * Handles syncing cached content with the database in the background
 */

import { browser } from '$app/environment';
import { contentCache } from '$lib/stores/contentCache.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';

interface SyncStatus {
  isActive: boolean;
  lastSyncAt: string | null;
  syncInterval: number; // milliseconds
  syncQueue: string[]; // topic IDs to sync
}

class BackgroundSyncService {
  private syncStatus: SyncStatus = {
    isActive: false,
    lastSyncAt: null,
    syncInterval: 30000, // 30 seconds
    syncQueue: []
  };
  
  private syncInterval: number | null = null;
  private isOnline = true;

  constructor() {
    if (browser) {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Check initial online status
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Start background sync
   */
  start(): void {
    if (!browser || this.syncStatus.isActive) return;
    
    console.log('🔄 [Background Sync] Starting background sync service');
    
    this.syncStatus.isActive = true;
    
    // Start periodic sync
    this.syncInterval = window.setInterval(() => {
      this.performSync();
    }, this.syncStatus.syncInterval);
    
    // Perform initial sync
    this.performSync();
  }

  /**
   * Stop background sync
   */
  stop(): void {
    if (!this.syncStatus.isActive) return;
    
    console.log('⏹️ [Background Sync] Stopping background sync service');
    
    this.syncStatus.isActive = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform sync operation
   */
  private async performSync(): Promise<void> {
    if (!this.isOnline || !this.syncStatus.isActive) return;
    
    try {
      const pendingTopics = contentCache.getPendingSyncTopics();
      
      if (pendingTopics.length === 0) {
        // No pending syncs, but check for cache integrity
        await this.checkCacheIntegrity();
        return;
      }
      
      console.log(`🔄 [Background Sync] Syncing ${pendingTopics.length} topics`);
      
      // Process each pending topic
      for (const topicId of pendingTopics) {
        try {
          await this.syncTopicToDatabase(topicId);
          contentCache.markAsSynced(topicId);
        } catch (error) {
          console.warn(`⚠️ [Background Sync] Failed to sync topic ${topicId}:`, error);
          // Continue with other topics
        }
      }
      
      this.syncStatus.lastSyncAt = new Date().toISOString();
      
    } catch (error) {
      console.error('❌ [Background Sync] Sync operation failed:', error);
    }
  }

  /**
   * Sync a specific topic to the database
   */
  private async syncTopicToDatabase(topicId: string): Promise<void> {
    const topicContent = contentCache.getCachedTopicContent(topicId);
    if (!topicContent) return;
    
    const sessionState = get(session);
    if (!sessionState?.id) {
      console.warn(`⚠️ [Background Sync] No active session for topic ${topicId}`);
      return;
    }
    
    console.log(`📤 [Background Sync] Syncing topic: ${topicContent.topic}`);
    
    try {
      // Sync chapters and paragraphs that have been generated
      for (const chapter of topicContent.chapters) {
        for (const paragraph of chapter.paragraphs) {
          if (paragraph.isGenerated && paragraph.content) {
            await this.syncParagraphToDatabase(paragraph, topicContent.topic, chapter.title);
          }
        }
      }
      
      console.log(`✅ [Background Sync] Successfully synced topic: ${topicContent.topic}`);
      
    } catch (error) {
      console.error(`❌ [Background Sync] Failed to sync topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Sync a paragraph to the database
   */
  private async syncParagraphToDatabase(
    paragraph: any,
    topicTitle: string,
    chapterTitle: string
  ): Promise<void> {
    try {
      // Check if paragraph already exists in database
      const response = await fetch('/api/check-paragraph-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphId: paragraph.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          console.log(`ℹ️ [Background Sync] Paragraph ${paragraph.id} already exists in database`);
          return;
        }
      }
      
      // Save paragraph content to database
      const saveResponse = await fetch('/api/save-paragraph-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphId: paragraph.id,
          content: paragraph.content,
          summary: paragraph.summary,
          metadata: paragraph.metadata,
          topicTitle,
          chapterTitle
        })
      });
      
      if (!saveResponse.ok) {
        throw new Error(`Failed to save paragraph: ${saveResponse.status}`);
      }
      
      console.log(`💾 [Background Sync] Saved paragraph ${paragraph.id} to database`);
      
    } catch (error) {
      console.error(`❌ [Background Sync] Failed to sync paragraph ${paragraph.id}:`, error);
      throw error;
    }
  }

  /**
   * Check cache integrity and refresh from database if needed
   */
  private async checkCacheIntegrity(): Promise<void> {
    // This could check if database has newer content than cache
    // For now, we'll keep it simple and just update the last sync time
    this.syncStatus.lastSyncAt = new Date().toISOString();
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 [Background Sync] Connection restored');
    this.isOnline = true;
    
    // Perform immediate sync when coming back online
    if (this.syncStatus.isActive) {
      setTimeout(() => this.performSync(), 1000);
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📴 [Background Sync] Connection lost');
    this.isOnline = false;
  }

  /**
   * Force sync a specific topic
   */
  async forceSyncTopic(topicId: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    try {
      await this.syncTopicToDatabase(topicId);
      contentCache.markAsSynced(topicId);
      console.log(`✅ [Background Sync] Force sync completed for topic: ${topicId}`);
    } catch (error) {
      console.error(`❌ [Background Sync] Force sync failed for topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if service is online
   */
  isServiceOnline(): boolean {
    return this.isOnline;
  }
}

// Create singleton instance
export const backgroundSync = new BackgroundSyncService();
