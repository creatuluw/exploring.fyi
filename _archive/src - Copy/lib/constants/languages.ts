/**
 * Language Constants and Configuration
 * Defines supported languages and their metadata
 */

import type { LanguageConfig, SupportedLanguage } from '$lib/types/language.js';

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    region: 'US'
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    region: 'NL'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    region: 'ES'
  }
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(lang => lang.code);

export function getLanguageConfig(code: SupportedLanguage): LanguageConfig {
  const config = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  if (!config) {
    throw new Error(`Unsupported language code: ${code}`);
  }
  return config;
}

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return LANGUAGE_CODES.includes(code as SupportedLanguage);
}

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const browserLang = navigator.language || navigator.languages?.[0] || DEFAULT_LANGUAGE;
  const langCode = browserLang.toLowerCase().substring(0, 2);

  // Map common language variations
  const langMapping: Record<string, SupportedLanguage> = {
    'en': 'en',
    'nl': 'nl',
    'es': 'es',
    'ca': 'es', // Catalan -> Spanish
    'pt': 'es', // Portuguese -> Spanish (closest supported)
    'de': 'en', // German -> English
    'fr': 'en', // French -> English
  };

  return langMapping[langCode] || DEFAULT_LANGUAGE;
}
