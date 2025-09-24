/**
 * Translation System Core
 * Handles loading and providing translations based on the selected interface language
 */

import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { interfaceLanguage } from '$lib/stores/language.js';
import type { SupportedLanguage } from '$lib/types/language.js';

// Translation cache to avoid repeated loading
const translationCache = new Map<SupportedLanguage, Record<string, any>>();

// Current translations store
export const currentTranslations = writable<Record<string, any>>({});

// Translation loading state
export const translationsLoading = writable<boolean>(true);

/**
 * Load translations for a specific language
 */
async function loadTranslations(language: SupportedLanguage): Promise<Record<string, any>> {
  // Check cache first
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }

  try {
    const translationModule = await import(`./translations/${language}.json`);
    const translations = translationModule.default;
    
    // Cache the translations
    translationCache.set(language, translations);
    
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for language: ${language}`, error);
    
    // Fallback to English if the language fails to load
    if (language !== 'en') {
      return loadTranslations('en');
    }
    
    // If even English fails, return empty object
    return {};
  }
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): string {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Translation function - gets translation for a key
 */
export function createTranslationFunction(translations: Record<string, any>) {
  return function t(key: string, fallback?: string): string {
    const value = getNestedValue(translations, key);
    
    if (value !== undefined) {
      return value;
    }
    
    // Return fallback or the key itself
    return fallback || key;
  };
}

// Create reactive translation function
export const t = derived(
  [currentTranslations],
  ([$translations]) => createTranslationFunction($translations)
);

/**
 * Initialize translations system
 */
export async function initializeTranslations() {
  if (!browser) return;
  
  // Load initial translations based on current language
  interfaceLanguage.subscribe(async (language) => {
    translationsLoading.set(true);
    
    try {
      const translations = await loadTranslations(language);
      currentTranslations.set(translations);
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      translationsLoading.set(false);
    }
  });
}

/**
 * Preload translations for a language (for faster switching)
 */
export async function preloadTranslations(language: SupportedLanguage) {
  if (!translationCache.has(language)) {
    await loadTranslations(language);
  }
}

/**
 * Get translation directly (for use outside of Svelte components)
 */
export async function getTranslation(key: string, language?: SupportedLanguage): Promise<string> {
  if (!language) {
    // Use current interface language
    const currentLang = document.documentElement.lang as SupportedLanguage || 'en';
    language = currentLang;
  }
  
  const translations = await loadTranslations(language);
  const translateFn = createTranslationFunction(translations);
  return translateFn(key);
}
