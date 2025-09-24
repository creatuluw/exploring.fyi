/**
 * Topic Resumption Service
 * Handles smart topic re-visit flow with progress preservation
 */

import { ChapterProgressTracker } from './chapterProgressTracking.js';
import { TocGenerationService } from './tocGeneration.js';
import { session } from '$lib/stores/session.js';
import { get } from 'svelte/store';

export interface TopicResumptionInfo {
	hasExistingContent: boolean;
	hasProgress: boolean;
	totalChapters: number;
	totalParagraphs: number;
	readParagraphs: number;
	completedChapters: number;
	overallProgress: number;
	lastActivity: string | null;
	recommendedAction: 'continue' | 'restart' | 'explore';
	nextUnreadChapter?: {
		chapterId: string;
		chapterTitle: string;
		chapterIndex: number;
		nextUnreadParagraph?: {
			paragraphId: string;
			paragraphIndex: number;
			summary?: string;
		};
	};
	progressSummary: {
		chaptersStarted: number;
		chaptersCompleted: number;
		averageChapterProgress: number;
		estimatedTimeRemaining: number; // in minutes
	};
}

export interface TopicRevisitOptions {
	mode: 'smart' | 'continue' | 'restart';
	targetChapterId?: string;
	targetParagraphId?: string;
}

export class TopicResumptionService {
	/**
	 * Analyze topic for smart resumption
	 */
	static async analyzeTopicForResumption(topicId: string): Promise<TopicResumptionInfo> {
		try {
			console.log(`📊 [Topic Resumption] Analyzing topic ${topicId} for resumption`);

			// Check if topic has existing ToC/chapters
			const existingToc = await TocGenerationService.getExistingToc(topicId);
			const hasExistingContent = existingToc && existingToc.length > 0;

			if (!hasExistingContent) {
				console.log(`ℹ️ [Topic Resumption] No existing content found`);
				return {
					hasExistingContent: false,
					hasProgress: false,
					totalChapters: 0,
					totalParagraphs: 0,
					readParagraphs: 0,
					completedChapters: 0,
					overallProgress: 0,
					lastActivity: null,
					recommendedAction: 'explore',
					progressSummary: {
						chaptersStarted: 0,
						chaptersCompleted: 0,
						averageChapterProgress: 0,
						estimatedTimeRemaining: 0
					}
				};
			}

			// Get progress statistics for all chapters
			const chapterStats = await ChapterProgressTracker.getTopicProgress(topicId);
			const totalChapters = existingToc.length;
			const totalParagraphs = existingToc.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0);
			
			let readParagraphs = 0;
			let completedChapters = 0;
			let chaptersStarted = 0;
			let lastActivity: string | null = null;

			// Calculate overall progress
			for (const stats of chapterStats) {
				readParagraphs += stats.readParagraphs;
				if (stats.isComplete) {
					completedChapters++;
				}
				if (stats.readParagraphs > 0) {
					chaptersStarted++;
				}
				if (stats.lastActivity && (!lastActivity || stats.lastActivity > lastActivity)) {
					lastActivity = stats.lastActivity;
				}
			}

			const overallProgress = totalParagraphs > 0 ? Math.round((readParagraphs / totalParagraphs) * 100) : 0;
			const averageChapterProgress = totalChapters > 0 ? overallProgress / totalChapters : 0;
			const hasProgress = readParagraphs > 0;

			// Find next unread content
			let nextUnreadChapter: TopicResumptionInfo['nextUnreadChapter'];
			for (const chapter of existingToc) {
				const chapterStats = chapterStats.find(stat => stat.chapterId === chapter.id);
				const isChapterComplete = chapterStats?.isComplete || false;
				
				if (!isChapterComplete) {
					// Find next unread paragraph in this chapter
					const chapterProgress = await ChapterProgressTracker.loadProgressState(topicId, chapter.id);
					const nextUnreadParagraph = chapter.paragraphs.find(p => !chapterProgress.has(p.id));
					
					nextUnreadChapter = {
						chapterId: chapter.id,
						chapterTitle: chapter.title,
						chapterIndex: chapter.index,
						nextUnreadParagraph: nextUnreadParagraph ? {
							paragraphId: nextUnreadParagraph.id,
							paragraphIndex: nextUnreadParagraph.index,
							summary: nextUnreadParagraph.summary
						} : undefined
					};
					break;
				}
			}

			// Determine recommended action
			let recommendedAction: TopicResumptionInfo['recommendedAction'];
			if (overallProgress === 100) {
				recommendedAction = 'restart'; // Topic fully complete
			} else if (hasProgress) {
				recommendedAction = 'continue'; // Has some progress
			} else {
				recommendedAction = 'explore'; // No progress yet
			}

			// Estimate time remaining (rough calculation: 2 minutes per paragraph)
			const unreadParagraphs = totalParagraphs - readParagraphs;
			const estimatedTimeRemaining = unreadParagraphs * 2;

			const resumptionInfo: TopicResumptionInfo = {
				hasExistingContent,
				hasProgress,
				totalChapters,
				totalParagraphs,
				readParagraphs,
				completedChapters,
				overallProgress,
				lastActivity,
				recommendedAction,
				nextUnreadChapter,
				progressSummary: {
					chaptersStarted,
					chaptersCompleted,
					averageChapterProgress,
					estimatedTimeRemaining
				}
			};

			console.log(`✅ [Topic Resumption] Analysis complete:`, resumptionInfo);
			return resumptionInfo;

		} catch (error) {
			console.error('❌ [Topic Resumption] Error analyzing topic for resumption:', error);
			throw error;
		}
	}

	/**
	 * Get smart navigation URL for topic based on resumption analysis
	 */
	static getSmartNavigationUrl(topicSlug: string, resumptionInfo: TopicResumptionInfo): string {
		const baseUrl = `/topic/${topicSlug}`;
		
		// Add resumption context as URL parameters
		const params = new URLSearchParams();
		params.set('resumption', 'true');
		params.set('progress', resumptionInfo.overallProgress.toString());
		
		if (resumptionInfo.nextUnreadChapter) {
			params.set('chapter', resumptionInfo.nextUnreadChapter.chapterId);
			if (resumptionInfo.nextUnreadChapter.nextUnreadParagraph) {
				params.set('paragraph', resumptionInfo.nextUnreadChapter.nextUnreadParagraph.paragraphId);
			}
		}

		return `${baseUrl}?${params.toString()}`;
	}

	/**
	 * Get human-readable progress description
	 */
	static getProgressDescription(resumptionInfo: TopicResumptionInfo): string {
		const { overallProgress, readParagraphs, totalParagraphs, completedChapters, totalChapters } = resumptionInfo;

		if (overallProgress === 100) {
			return `Completed all ${totalChapters} chapters`;
		} else if (overallProgress === 0) {
			return `Not started - ${totalParagraphs} paragraphs to explore`;
		} else if (completedChapters > 0) {
			const remaining = totalChapters - completedChapters;
			return `${completedChapters} of ${totalChapters} chapters complete, ${remaining} remaining`;
		} else {
			return `${readParagraphs} of ${totalParagraphs} paragraphs read (${overallProgress}%)`;
		}
	}

	/**
	 * Get recommended action text
	 */
	static getRecommendedActionText(resumptionInfo: TopicResumptionInfo): string {
		switch (resumptionInfo.recommendedAction) {
			case 'continue':
				if (resumptionInfo.nextUnreadChapter?.nextUnreadParagraph) {
					return `Continue reading from "${resumptionInfo.nextUnreadChapter.nextUnreadParagraph.summary || 'next paragraph'}"`;
				} else if (resumptionInfo.nextUnreadChapter) {
					return `Continue with "${resumptionInfo.nextUnreadChapter.chapterTitle}"`;
				} else {
					return 'Continue where you left off';
				}
			case 'restart':
				return 'Start fresh exploration';
			case 'explore':
				return 'Begin learning journey';
			default:
				return 'Explore content';
		}
	}

	/**
	 * Get time estimate text
	 */
	static getTimeEstimateText(estimatedMinutes: number): string {
		if (estimatedMinutes === 0) {
			return 'Complete';
		} else if (estimatedMinutes < 60) {
			return `~${estimatedMinutes} min remaining`;
		} else {
			const hours = Math.floor(estimatedMinutes / 60);
			const minutes = estimatedMinutes % 60;
			if (minutes === 0) {
				return `~${hours}h remaining`;
			} else {
				return `~${hours}h ${minutes}m remaining`;
			}
		}
	}

	/**
	 * Check if session can access topic progress
	 */
	static canAccessProgress(): boolean {
		const sessionState = get(session);
		return Boolean(sessionState?.id);
	}
}
