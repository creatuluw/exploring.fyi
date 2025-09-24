/**
 * Chapter Progress Tracking Service
 * Enhanced progress tracking for the new chapter/paragraph structure
 */

import { ParagraphProgressService } from '$lib/database/paragraphProgress.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';

export interface ParagraphReadingSession {
	paragraphId: string;
	startTime: number;
	endTime?: number;
	isActive: boolean;
}

export interface ChapterProgressStats {
	chapterId: string;
	totalParagraphs: number;
	readParagraphs: number;
	progressPercentage: number;
	totalTimeSpent: number; // in seconds
	lastActivity: string | null;
	isComplete: boolean;
	completedAt: string | null;
}

export interface ChapterCompletionEvent {
	chapterId: string;
	topicId: string;
	completedAt: string;
	totalParagraphs: number;
	timeSpent: number;
}

/**
 * Enhanced progress tracking for chapter-based content
 */
export class ChapterProgressTracker {
	private static readingSessions = new Map<string, ParagraphReadingSession>();
	private static paragraphStartTimes = new Map<string, number>();
	private static chapterCompletionCallbacks = new Map<string, (event: ChapterCompletionEvent) => void>();
	
	/**
	 * Start tracking reading time for a paragraph
	 */
	static startParagraphReading(paragraphId: string): void {
		const now = Date.now();
		
		// End any other active sessions first
		this.endAllActiveSessions();
		
		// Start new session
		this.readingSessions.set(paragraphId, {
			paragraphId,
			startTime: now,
			isActive: true
		});
		
		this.paragraphStartTimes.set(paragraphId, now);
		
		console.log(`⏱️ [Chapter Progress] Started reading paragraph: ${paragraphId}`);
	}
	
	/**
	 * End tracking reading time for a paragraph
	 */
	static endParagraphReading(paragraphId: string): number {
		const session = this.readingSessions.get(paragraphId);
		const startTime = this.paragraphStartTimes.get(paragraphId);
		
		if (!session || !startTime) {
			return 0;
		}
		
		const endTime = Date.now();
		const timeSpent = Math.round((endTime - startTime) / 1000); // Convert to seconds
		
		// Update session
		session.endTime = endTime;
		session.isActive = false;
		
		// Clean up
		this.paragraphStartTimes.delete(paragraphId);
		
		console.log(`⏱️ [Chapter Progress] Ended reading paragraph: ${paragraphId}, time spent: ${timeSpent}s`);
		
		return timeSpent;
	}
	
	/**
	 * End all active reading sessions
	 */
	static endAllActiveSessions(): void {
		for (const [paragraphId, session] of this.readingSessions.entries()) {
			if (session.isActive) {
				this.endParagraphReading(paragraphId);
			}
		}
	}

	/**
	 * Register callback for chapter completion events
	 */
	static onChapterComplete(chapterId: string, callback: (event: ChapterCompletionEvent) => void): void {
		this.chapterCompletionCallbacks.set(chapterId, callback);
	}

	/**
	 * Unregister chapter completion callback
	 */
	static offChapterComplete(chapterId: string): void {
		this.chapterCompletionCallbacks.delete(chapterId);
	}
	
	/**
	 * Mark paragraph as read with time tracking and database persistence
	 */
	static async markParagraphAsRead(
		topicId: string,
		chapterId: string,
		paragraphId: string,
		paragraphContent: string
	): Promise<boolean> {
		const sessionState = get(session);
		if (!sessionState?.id) {
			console.warn('⚠️ [Chapter Progress] No session available for tracking progress');
			return false;
		}
		
		try {
			// End reading session and get time spent
			const timeSpent = this.endParagraphReading(paragraphId);
			
			// Use the existing paragraph progress service
			// Note: We use chapterId as sectionId for compatibility
			const success = await ParagraphProgressService.markAsRead(
				sessionState.id,
				topicId,
				chapterId, // Use chapter ID as section ID
				paragraphId,
				paragraphContent
			);
			
			if (success) {
				console.log(`✅ [Chapter Progress] Marked paragraph ${paragraphId} as read (${timeSpent}s)`);
				
				// Check if chapter is now complete
				await this.checkAndTriggerChapterCompletion(topicId, chapterId);
				
				return true;
			} else {
				console.error('❌ [Chapter Progress] Failed to mark paragraph as read');
				return false;
			}
		} catch (error) {
			console.error('❌ [Chapter Progress] Error marking paragraph as read:', error);
			return false;
		}
	}
	
	/**
	 * Mark paragraph as unread
	 */
	static async markParagraphAsUnread(
		topicId: string,
		chapterId: string,
		paragraphId: string,
		paragraphContent: string
	): Promise<boolean> {
		const sessionState = get(session);
		if (!sessionState?.id) {
			return false;
		}
		
		try {
			// End any active reading session
			this.endParagraphReading(paragraphId);
			
			const success = await ParagraphProgressService.markAsUnread(
				sessionState.id,
				topicId,
				chapterId, // Use chapter ID as section ID
				paragraphId,
				paragraphContent
			);
			
			if (success) {
				console.log(`✅ [Chapter Progress] Marked paragraph ${paragraphId} as unread`);
				return true;
			} else {
				console.error('❌ [Chapter Progress] Failed to mark paragraph as unread');
				return false;
			}
		} catch (error) {
			console.error('❌ [Chapter Progress] Error marking paragraph as unread:', error);
			return false;
		}
	}
	
	/**
	 * Get reading progress for a specific chapter
	 */
	static async getChapterProgress(
		topicId: string,
		chapterId: string
	): Promise<ChapterProgressStats | null> {
		const sessionState = get(session);
		if (!sessionState?.id) {
			return null;
		}
		
		try {
			const progressData = await ParagraphProgressService.getSectionProgress(
				sessionState.id,
				topicId,
				chapterId // Use chapter ID as section ID
			);
			
			const readParagraphs = progressData.filter(p => p.isRead).length;
			const totalParagraphs = progressData.length;
			const progressPercentage = totalParagraphs > 0 ? Math.round((readParagraphs / totalParagraphs) * 100) : 0;
			
			// Calculate last activity (most recent read time)
			const lastActivity = progressData
				.filter(p => p.readAt)
				.map(p => p.readAt!)
				.sort()
				.pop() || null;
			
			const isComplete = readParagraphs === totalParagraphs && totalParagraphs > 0;
			
			return {
				chapterId,
				totalParagraphs,
				readParagraphs,
				progressPercentage,
				totalTimeSpent: 0, // TODO: Implement actual time tracking storage
				lastActivity,
				isComplete,
				completedAt: isComplete ? lastActivity : null
			};
		} catch (error) {
			console.error('❌ [Chapter Progress] Error getting chapter progress:', error);
			return null;
		}
	}
	
	/**
	 * Get reading progress for all chapters in a topic
	 */
	static async getTopicProgress(topicId: string): Promise<ChapterProgressStats[]> {
		const sessionState = get(session);
		if (!sessionState?.id) {
			return [];
		}
		
		try {
			const allProgress = await ParagraphProgressService.getTopicProgress(
				sessionState.id,
				topicId
			);
			
			// Group by section (chapter) ID
			const chapterGroups = new Map<string, typeof allProgress>();
			for (const progress of allProgress) {
				const chapterId = progress.sectionId; // section ID is our chapter ID
				if (!chapterGroups.has(chapterId)) {
					chapterGroups.set(chapterId, []);
				}
				chapterGroups.get(chapterId)!.push(progress);
			}
			
			// Convert to chapter stats
			const chapterStats: ChapterProgressStats[] = [];
			for (const [chapterId, progressData] of chapterGroups.entries()) {
				const readParagraphs = progressData.filter(p => p.isRead).length;
				const totalParagraphs = progressData.length;
				const progressPercentage = totalParagraphs > 0 ? Math.round((readParagraphs / totalParagraphs) * 100) : 0;
				
				const lastActivity = progressData
					.filter(p => p.readAt)
					.map(p => p.readAt!)
					.sort()
					.pop() || null;
				
				const isComplete = readParagraphs === totalParagraphs && totalParagraphs > 0;
				
				chapterStats.push({
					chapterId,
					totalParagraphs,
					readParagraphs,
					progressPercentage,
					totalTimeSpent: 0, // TODO: Implement actual time tracking storage
					lastActivity,
					isComplete,
					completedAt: isComplete ? lastActivity : null
				});
			}
			
			return chapterStats;
		} catch (error) {
			console.error('❌ [Chapter Progress] Error getting topic progress:', error);
			return [];
		}
	}
	
	/**
	 * Check if all paragraphs in a chapter are read (chapter completion)
	 */
	static async isChapterComplete(topicId: string, chapterId: string): Promise<boolean> {
		const progress = await this.getChapterProgress(topicId, chapterId);
		return progress ? progress.readParagraphs === progress.totalParagraphs && progress.totalParagraphs > 0 : false;
	}

	/**
	 * Check for chapter completion and trigger callbacks if complete
	 */
	static async checkAndTriggerChapterCompletion(topicId: string, chapterId: string): Promise<void> {
		try {
			const isComplete = await this.isChapterComplete(topicId, chapterId);
			
			if (isComplete) {
				const progress = await this.getChapterProgress(topicId, chapterId);
				
				if (progress) {
					const completionEvent: ChapterCompletionEvent = {
						chapterId,
						topicId,
						completedAt: new Date().toISOString(),
						totalParagraphs: progress.totalParagraphs,
						timeSpent: progress.totalTimeSpent
					};

					console.log(`🎉 [Chapter Progress] Chapter completed: ${chapterId}`);

					// Trigger registered callback
					const callback = this.chapterCompletionCallbacks.get(chapterId);
					if (callback) {
						callback(completionEvent);
					}

					// TODO: Store chapter completion in database if needed
					// For now, completion is derived from paragraph progress
				}
			}
		} catch (error) {
			console.error('❌ [Chapter Progress] Error checking chapter completion:', error);
		}
	}
	
	/**
	 * Load existing progress state for UI initialization
	 */
	static async loadProgressState(
		topicId: string,
		chapterId: string
	): Promise<Set<string>> {
		const sessionState = get(session);
		if (!sessionState?.id) {
			return new Set();
		}
		
		try {
			const progressData = await ParagraphProgressService.getSectionProgress(
				sessionState.id,
				topicId,
				chapterId
			);
			
			// Return set of read paragraph IDs
			return new Set(
				progressData
					.filter(p => p.isRead)
					.map(p => p.paragraphId)
			);
		} catch (error) {
			console.error('❌ [Chapter Progress] Error loading progress state:', error);
			return new Set();
		}
	}
}

/**
 * Hook for automatic cleanup on page unload
 */
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		ChapterProgressTracker.endAllActiveSessions();
	});
	
	// Also cleanup on page visibility change (when user switches tabs)
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			ChapterProgressTracker.endAllActiveSessions();
		}
	});
}
