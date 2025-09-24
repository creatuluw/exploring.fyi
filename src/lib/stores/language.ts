/**
 * Language Settings Store
 * Manages user language preferences with persistence
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { SupportedLanguage, LanguageSettings } from '$lib/types/language.js';
import { DEFAULT_LANGUAGE, detectBrowserLanguage } from '$lib/constants/languages.js';

// Initialize with browser-detected language or defaults
const initialSettings: LanguageSettings = {
  interface: browser ? detectBrowserLanguage() : DEFAULT_LANGUAGE,
  ai: browser ? detectBrowserLanguage() : DEFAULT_LANGUAGE
};

// Load from localStorage if available
function loadLanguageSettings(): LanguageSettings {
  if (!browser) return initialSettings;
  
  try {
    const stored = localStorage.getItem('exploring-fyi-language-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        interface: parsed.interface || initialSettings.interface,
        ai: parsed.ai || parsed.aiInput || parsed.aiOutput || initialSettings.ai // Support migration from old format
      };
    }
  } catch (error) {
    console.warn('Failed to load language settings from localStorage:', error);
  }
  
  return initialSettings;
}

// Save to localStorage
function saveLanguageSettings(settings: LanguageSettings) {
  if (!browser) return;
  
  try {
    localStorage.setItem('exploring-fyi-language-settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save language settings to localStorage:', error);
  }
}

// Main language settings store
export const languageSettings = writable<LanguageSettings>(loadLanguageSettings());

// Subscribe to changes and persist
languageSettings.subscribe(settings => {
  saveLanguageSettings(settings);
});

// Derived stores for specific language aspects
export const interfaceLanguage = derived(
  languageSettings, 
  $settings => $settings.interface
);

export const aiLanguage = derived(
  languageSettings, 
  $settings => $settings.ai
);

// Backward compatibility - both input and output use the same language
export const aiInputLanguage = derived(
  languageSettings, 
  $settings => $settings.ai
);

export const aiOutputLanguage = derived(
  languageSettings, 
  $settings => $settings.ai
);

// Helper functions for updating language settings
export const languageActions = {
  setInterfaceLanguage(language: SupportedLanguage) {
    languageSettings.update(settings => ({
      ...settings,
      interface: language
    }));
  },

  setAiLanguage(language: SupportedLanguage) {
    languageSettings.update(settings => ({
      ...settings,
      ai: language
    }));
  },

  // Backward compatibility
  setAiInputLanguage(language: SupportedLanguage) {
    this.setAiLanguage(language);
  },

  setAiOutputLanguage(language: SupportedLanguage) {
    this.setAiLanguage(language);
  },

  setAllLanguages(language: SupportedLanguage) {
    languageSettings.set({
      interface: language,
      ai: language
    });
  },

  updateSettings(newSettings: Partial<LanguageSettings>) {
    languageSettings.update(settings => ({
      ...settings,
      ...newSettings
    }));
  },

  resetToDefaults() {
    const browserLang = detectBrowserLanguage();
    languageSettings.set({
      interface: browserLang,
      ai: browserLang
    });
  },

  getCurrentSettings(): LanguageSettings {
    return get(languageSettings);
  }
};
