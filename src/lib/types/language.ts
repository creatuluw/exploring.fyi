/**
 * Language Support Types
 * Defines supported languages and language configuration interfaces
 */

export type SupportedLanguage = 'en' | 'nl' | 'es';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  region?: string;
}

export interface LanguageSettings {
  interface: SupportedLanguage;
  ai: SupportedLanguage; // Combined AI input and output language
}

export interface LanguageDetectionResult {
  detected: SupportedLanguage;
  confidence: number;
  supported: boolean;
}
