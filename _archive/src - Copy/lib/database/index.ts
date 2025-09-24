/**
 * Database Services Index
 * Central export point for all database services
 */

// Export Supabase client and types
export { supabase, dbHelpers, type Database } from './supabase.js';

// Export all service classes
export { SessionService } from './sessions.js';
export { TopicsService } from './topics.js';
export { MindMapsService, type MindMapNode, type MindMapEdge } from './mindMaps.js';
export { SourcesService } from './sources.js';
export { ProgressService } from './progress.js';
export { ContentCacheService } from './contentCache.js';

// Note: Direct imports are preferred over this index file to avoid circular dependencies
// Use direct imports like: import { SessionService } from '$lib/database/sessions.js'

/**
 * Database connection health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    return await dbHelpers.checkConnection();
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Initialize database connection and verify setup
 */
export async function initializeDatabase(): Promise<boolean> {
  console.log('Initializing database connection...');
  
  const isHealthy = await checkDatabaseHealth();
  
  if (isHealthy) {
    console.log('✅ Database connection established successfully');
  } else {
    console.error('❌ Database connection failed');
  }
  
  return isHealthy;
}
