<!--
  Language Picker Component
  Dropdown component for selecting languages with flags and native names
-->
<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import type { SupportedLanguage } from '$lib/types/language.js';
  import { SUPPORTED_LANGUAGES, getLanguageConfig } from '$lib/constants/languages.js';
  
  interface Props {
    value: SupportedLanguage;
    onchange: (language: SupportedLanguage) => void;
    label?: string;
    disabled?: boolean;
  }
  
  let { value, onchange, label, disabled = false }: Props = $props();
  
  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement;
  
  const currentLanguage = $derived(getLanguageConfig(value));
  
  function selectLanguage(language: SupportedLanguage) {
    if (language !== value) {
      onchange(language);
    }
    isOpen = false;
  }
  
  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
  
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }
  
  // Close dropdown when clicking outside
  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-2">
  {#if label}
    <label for="language-picker-{value}" class="block text-sm font-medium text-zinc-700 font-inter">
      {label}
    </label>
  {/if}
  
  <div class="relative" bind:this={dropdownRef}>
    <!-- Selected Value Button -->
    <button
      id="language-picker-{value}"
      type="button"
      onclick={toggleDropdown}
      disabled={disabled}
      class="relative w-full bg-white border border-zinc-300 rounded-lg shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 transition-colors duration-200 {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400'}"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
    >
      <span class="flex items-center space-x-3">
        <span class="text-xl" role="img" aria-label={currentLanguage.name}>
          {currentLanguage.flag}
        </span>
        <span class="block truncate font-inter text-sm text-zinc-900">
          {currentLanguage.nativeName}
        </span>
      </span>
      <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown 
          class="h-4 w-4 text-zinc-400 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" 
        />
      </span>
    </button>

    <!-- Dropdown Menu -->
    {#if isOpen}
      <div class="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-zinc-200">
        {#each SUPPORTED_LANGUAGES as language}
          <button
            type="button"
            onclick={() => selectLanguage(language.code)}
            class="w-full text-left px-3 py-2 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none transition-colors duration-150 {value === language.code ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'}"
            role="option"
            aria-selected={value === language.code}
          >
            <span class="flex items-center space-x-3">
              <span class="text-xl" role="img" aria-label={language.name}>
                {language.flag}
              </span>
              <div class="flex-1">
                <span class="block font-medium font-inter text-sm">
                  {language.nativeName}
                </span>
                <span class="block text-xs text-zinc-500 font-inter">
                  {language.name}
                </span>
              </div>
              {#if value === language.code}
                <span class="text-zinc-500">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
              {/if}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
