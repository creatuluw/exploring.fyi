<!--
  Settings Page
  User interface for configuring language preferences and other application settings
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    ArrowLeft, 
    Save, 
    RotateCcw, 
    Globe, 
    MessageSquare, 
    Volume2,
    Info,
    CheckCircle
  } from 'lucide-svelte';
  
  import LanguagePicker from '$lib/components/LanguagePicker.svelte';
	import { 
		languageSettings, 
		languageActions, 
		interfaceLanguage,
		aiLanguage
	} from '$lib/stores/language.js';
	import { t } from '$lib/i18n/index.js';
  import type { SupportedLanguage, LanguageSettings } from '$lib/types/language.js';
  import { session } from '$lib/stores/session.js';
  
  // Local state for the form
  let localSettings = $state<LanguageSettings>({
    interface: 'en',
    ai: 'en'
  });
  
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let hasChanges = $state(false);
  
  // Load current settings on mount
  onMount(() => {
    localSettings = languageActions.getCurrentSettings();
  });
  
  // Watch for changes
  $effect(() => {
    const current = languageActions.getCurrentSettings();
    hasChanges = (
      localSettings.interface !== current.interface ||
      localSettings.ai !== current.ai
    );
  });
  
  async function saveSettings() {
    if (!hasChanges) return;
    
    isSaving = true;
    saveSuccess = false;
    
    try {
      // Update the language store
      languageActions.updateSettings(localSettings);
      
      // TODO: Update session in database when database migration is complete
      // const sessionState = get(session);
      // if (sessionState.id) {
      //   await SessionService.updateLanguageSettings(sessionState.id, localSettings);
      // }
      
      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save language settings:', error);
      // TODO: Show error notification
    } finally {
      isSaving = false;
    }
  }
  
  function resetToDefaults() {
    languageActions.resetToDefaults();
    localSettings = languageActions.getCurrentSettings();
  }
  
  function handleInterfaceLanguageChange(language: SupportedLanguage) {
    localSettings.interface = language;
  }
  
  function handleAiLanguageChange(language: SupportedLanguage) {
    localSettings.ai = language;
  }
  
  function goBack() {
    goto('/');
  }
</script>

<svelte:head>
	<title>{$t('settings.title')} - Explore.fyi</title>
	<meta name="description" content="{$t('settings.subtitle')}" />
</svelte:head>

<div class="min-h-screen bg-zinc-50">
  <!-- Header -->
  <div class="bg-white border-b border-zinc-200">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-4">
          <button
            onclick={goBack}
            class="inline-flex items-center p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <div>
            <h1 class="text-xl font-semibold text-zinc-900 font-inter">{$t('settings.title')}</h1>
            <p class="text-sm text-zinc-500 font-inter">{$t('settings.subtitle')}</p>
          </div>
        </div>
        
        <!-- Save Status -->
        {#if saveSuccess}
          <div class="flex items-center space-x-2 text-green-600">
            <CheckCircle class="h-5 w-5" />
            <span class="text-sm font-medium font-inter">{$t('settings.settings_saved')}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Main Content -->
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Settings Form -->
      <div class="lg:col-span-2 space-y-8">
        
        <!-- Language Settings Card -->
        <div class="bg-white rounded-xl border border-zinc-200 p-6">
          <div class="flex items-center space-x-3 mb-6">
            <div class="p-2 bg-blue-100 rounded-lg">
              <Globe class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-zinc-900 font-inter">{$t('settings.language_settings')}</h2>
              <p class="text-sm text-zinc-500 font-inter">{$t('settings.language_settings_desc')}</p>
            </div>
          </div>
          
          <div class="space-y-6">
            
            <!-- Interface Language -->
            <div>
              <div class="flex items-center space-x-2 mb-2">
                <MessageSquare class="h-4 w-4 text-zinc-500" />
                <span class="text-sm font-medium text-zinc-700 font-inter">{$t('settings.interface_language')}</span>
              </div>
              <LanguagePicker
                value={localSettings.interface}
                onchange={handleInterfaceLanguageChange}
              />
              <p class="text-xs text-zinc-500 mt-2 font-inter">
{$t('settings.interface_language_desc')}
              </p>
            </div>
            
            <!-- AI Language -->
            <div>
              <div class="flex items-center space-x-2 mb-2">
                <Volume2 class="h-4 w-4 text-zinc-500" />
                <span class="text-sm font-medium text-zinc-700 font-inter">{$t('settings.ai_language')}</span>
              </div>
              <LanguagePicker
                value={localSettings.ai}
                onchange={handleAiLanguageChange}
              />
              <p class="text-xs text-zinc-500 mt-2 font-inter">
{$t('settings.ai_language_desc')}
              </p>
            </div>
            
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            onclick={saveSettings}
            disabled={!hasChanges || isSaving}
            class="btn btn-primary flex-1 sm:flex-none {!hasChanges || isSaving ? 'opacity-50 cursor-not-allowed' : ''}"
          >
            {#if isSaving}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {:else}
              <Save class="h-4 w-4 mr-2" />
            {/if}
{isSaving ? $t('settings.saving') : $t('settings.save_settings')}
          </button>
          
          <button
            onclick={resetToDefaults}
            class="btn btn-secondary flex-1 sm:flex-none"
          >
            <RotateCcw class="h-4 w-4 mr-2" />
{$t('settings.reset_to_defaults')}
          </button>
        </div>
        
      </div>
      
      <!-- Info Sidebar -->
      <div class="space-y-6">
        
        <!-- Language Info Card -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div class="flex items-start space-x-3">
            <Info class="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 class="text-sm font-semibold text-blue-900 font-inter mb-2">{$t('settings.how_language_settings_work')}</h3>
              <ul class="text-xs text-blue-800 space-y-1 font-inter">
                <li>• {$t('settings.interface_changes')}</li>
                <li>• {$t('settings.ai_language_desc_full')}</li>
                <li>• {$t('settings.existing_content')}</li>
                <li>• {$t('settings.new_explorations')}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Supported Languages -->
        <div class="bg-white border border-zinc-200 rounded-xl p-4">
          <h3 class="text-sm font-semibold text-zinc-900 font-inter mb-3">{$t('settings.supported_languages')}</h3>
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <span class="text-lg">🇺🇸</span>
              <span class="text-sm text-zinc-700 font-inter">English</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-lg">🇳🇱</span>
              <span class="text-sm text-zinc-700 font-inter">Nederlands (Dutch)</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-lg">🇪🇸</span>
              <span class="text-sm text-zinc-700 font-inter">Español (Spanish)</span>
            </div>
          </div>
        </div>
        
      </div>
      
    </div>
  </div>
</div>
