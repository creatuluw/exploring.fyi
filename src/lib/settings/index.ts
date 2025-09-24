// Settings configuration for the exploring.fyi application
import settingsJson from './settings.json';

export interface AppSettings {
  'max-mindmap-nodes': number;
  'max-chapters-generated': number;
  'max-paragraphs-generated': number;
  'max-words-per-paragraph': number;
  'ai-model-temperature': number;
  'ai-max-output-tokens': number;
  'mindmap-node-radius': number;
  'mindmap-node-width': number;
  'mindmap-base-radius': number;
  'mindmap-min-radius': number;
  'mindmap-max-radius': number;
  'default-difficulty': 'beginner' | 'intermediate' | 'advanced';
  'default-language': string;
  'api-timeout-ms': number;
  'pagination-limit': number;
  'search-result-limit': number;
  'recent-topics-limit': number;
}

// Load settings from JSON file
const settings: AppSettings = settingsJson as AppSettings;

// Export individual settings for easier access
export const MAX_MINDMAP_NODES = settings['max-mindmap-nodes'];
export const MAX_CHAPTERS_GENERATED = settings['max-chapters-generated'];
export const MAX_PARAGRAPHS_GENERATED = settings['max-paragraphs-generated'];
export const MAX_WORDS_PER_PARAGRAPH = settings['max-words-per-paragraph'];
export const AI_MODEL_TEMPERATURE = settings['ai-model-temperature'];
export const AI_MAX_OUTPUT_TOKENS = settings['ai-max-output-tokens'];
export const MINDMAP_NODE_RADIUS = settings['mindmap-node-radius'];
export const MINDMAP_NODE_WIDTH = settings['mindmap-node-width'];
export const MINDMAP_BASE_RADIUS = settings['mindmap-base-radius'];
export const MINDMAP_MIN_RADIUS = settings['mindmap-min-radius'];
export const MINDMAP_MAX_RADIUS = settings['mindmap-max-radius'];
export const DEFAULT_DIFFICULTY = settings['default-difficulty'];
export const DEFAULT_LANGUAGE = settings['default-language'];
export const API_TIMEOUT_MS = settings['api-timeout-ms'];
export const PAGINATION_LIMIT = settings['pagination-limit'];
export const SEARCH_RESULT_LIMIT = settings['search-result-limit'];
export const RECENT_TOPICS_LIMIT = settings['recent-topics-limit'];

// Export the full settings object
export default settings;

// Utility function to get a setting value by key
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return settings[key];
}

// Utility function to update settings at runtime (for future use)
export function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  settings[key] = value;
}
