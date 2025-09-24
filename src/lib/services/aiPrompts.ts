/**
 * AI Prompts Service
 * Handles language-specific prompts for AI content generation
 */

import type { SupportedLanguage } from '$lib/types/language.js';

/**
 * Gets the appropriate topic analysis prompt based on AI language setting
 */
export function getTopicAnalysisPrompt(
  topic: string, 
  aiLang: SupportedLanguage,
  maxAspects?: number
): string {
  const inputPrompts = {
    en: `Analyze the topic "${topic}" and provide a comprehensive breakdown`,
    nl: `Analyseer het onderwerp "${topic}" en geef een uitgebreide uiteenzetting`,
    es: `Analiza el tema "${topic}" y proporciona un desglose completo`
  };
  
  const outputInstructions = {
    en: "Provide your response in English. Use clear, educational language suitable for learners.",
    nl: "Geef je antwoord in het Nederlands. Gebruik duidelijke, educatieve taal die geschikt is voor leerlingen.",
    es: "Proporciona tu respuesta en español. Usa un lenguaje claro y educativo adecuado para estudiantes."
  };
  
  const aspectsInstruction = maxAspects ? {
    en: `Break down the topic into exactly ${maxAspects} key aspects, include learning paths, and estimate difficulty.`,
    nl: `Splits het onderwerp op in precies ${maxAspects} belangrijke aspecten, voeg leertrajecten toe en schat de moeilijkheidsgraad in.`,
    es: `Divide el tema en exactamente ${maxAspects} aspectos clave, incluye rutas de aprendizaje y estima la dificultad.`
  } : {
    en: `Break down the topic into key aspects, include learning paths, and estimate difficulty.`,
    nl: `Splits het onderwerp op in belangrijke aspecten, voeg leertrajecten toe en schat de moeilijkheidsgraad in.`,
    es: `Divide el tema en aspectos clave, incluye rutas de aprendizaje y estima la dificultad.`
  };
  
  const structureInstructions = {
    en: `${aspectsInstruction.en} Focus on creating a comprehensive understanding that can be explored interactively.`,
    nl: `${aspectsInstruction.nl} Focus op het creëren van een uitgebreid begrip dat interactief kan worden verkend.`,
    es: `${aspectsInstruction.es} Enfócate en crear una comprensión integral que pueda explorarse de manera interactiva.`
  };
  
  return `${inputPrompts[aiLang]}. ${outputInstructions[aiLang]} ${structureInstructions[aiLang]}`;
}

/**
 * Gets the appropriate concept expansion prompt based on AI language setting
 */
export function getConceptExpansionPrompt(
  concept: string,
  parentTopic: string,
  aiLang: SupportedLanguage
): string {
  const inputPrompts = {
    en: `Expand the concept "${concept}" in the context of "${parentTopic}"`,
    nl: `Breid het concept "${concept}" uit in de context van "${parentTopic}"`,
    es: `Expande el concepto "${concept}" en el contexto de "${parentTopic}"`
  };
  
  const outputInstructions = {
    en: "Provide your response in English with detailed sub-concepts, examples, and practical applications.",
    nl: "Geef je antwoord in het Nederlands met gedetailleerde sub-concepten, voorbeelden en praktische toepassingen.",
    es: "Proporciona tu respuesta en español con sub-conceptos detallados, ejemplos y aplicaciones prácticas."
  };
  
  const structureInstructions = {
    en: `Break this concept into digestible sub-concepts with clear explanations. 
         Include real-world examples and common misconceptions. Make it educational and engaging.`,
    nl: `Splits dit concept op in verteerbare sub-concepten met duidelijke uitleg. 
         Voeg praktijkvoorbeelden en veelvoorkomende misvattingen toe. Maak het educatief en boeiend.`,
    es: `Divide este concepto en sub-conceptos digeribles con explicaciones claras. 
         Incluye ejemplos del mundo real y conceptos erróneos comunes. Hazlo educativo y atractivo.`
  };
  
  return `${inputPrompts[aiLang]}. ${outputInstructions[aiLang]} ${structureInstructions[aiLang]}`;
}

/**
 * Gets the appropriate URL analysis prompt based on AI language setting
 */
export function getUrlAnalysisPrompt(
  url: string,
  aiLang: SupportedLanguage
): string {
  const inputPrompts = {
    en: `Analyze the content from this URL: "${url}"`,
    nl: `Analyseer de inhoud van deze URL: "${url}"`,
    es: `Analiza el contenido de esta URL: "${url}"`
  };
  
  const outputInstructions = {
    en: "Provide your analysis in English, focusing on key concepts and educational value.",
    nl: "Geef je analyse in het Nederlands, focus op belangrijke concepten en educatieve waarde.",
    es: "Proporciona tu análisis en español, enfocándote en conceptos clave y valor educativo."
  };
  
  const structureInstructions = {
    en: `Extract the main concepts, assess credibility, summarize key points, and suggest related topics. 
         Make the analysis suitable for creating an interactive learning experience.`,
    nl: `Haal de hoofdconcepten eruit, beoordeel de geloofwaardigheid, vat belangrijke punten samen en stel gerelateerde onderwerpen voor. 
         Maak de analyse geschikt voor het creëren van een interactieve leerervaring.`,
    es: `Extrae los conceptos principales, evalúa la credibilidad, resume los puntos clave y sugiere temas relacionados. 
         Haz que el análisis sea adecuado para crear una experiencia de aprendizaje interactiva.`
  };
  
  return `${inputPrompts[aiLang]}. ${outputInstructions[aiLang]} ${structureInstructions[aiLang]}`;
}

/**
 * Gets the appropriate content generation prompt based on AI language setting
 */
export function getContentGenerationPrompt(
  topic: string,
  context: string | undefined,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  aiLang: SupportedLanguage
): string {
  const difficultyLabels = {
    en: { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' },
    nl: { beginner: 'beginner', intermediate: 'gemiddeld', advanced: 'gevorderd' },
    es: { beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzado' }
  };
  
  const inputPrompts = {
    en: `Generate comprehensive educational content about "${topic}" at ${difficultyLabels.en[difficulty]} level`,
    nl: `Genereer uitgebreide educatieve inhoud over "${topic}" op ${difficultyLabels.nl[difficulty]} niveau`,
    es: `Genera contenido educativo integral sobre "${topic}" a nivel ${difficultyLabels.es[difficulty]}`
  };
  
  const contextAddition = context ? {
    en: ` in the context of "${context}"`,
    nl: ` in de context van "${context}"`,
    es: ` en el contexto de "${context}"`
  } : { en: '', nl: '', es: '' };
  
  const outputInstructions = {
    en: "Create detailed content in English with clear sections, practical examples, and actionable steps.",
    nl: "Creëer gedetailleerde inhoud in het Nederlands met duidelijke secties, praktische voorbeelden en uitvoerbare stappen.",
    es: "Crea contenido detallado en español con secciones claras, ejemplos prácticos y pasos accionables."
  };
  
  const structureInstructions = {
    en: `Structure the content with: overview, detailed sections, prerequisites, practical steps, 
         common questions, and next steps. Make it comprehensive and educational.`,
    nl: `Structureer de inhoud met: overzicht, gedetailleerde secties, vereisten, praktische stappen, 
         veelgestelde vragen en volgende stappen. Maak het uitgebreid en educatief.`,
    es: `Estructura el contenido con: resumen, secciones detalladas, prerequisitos, pasos prácticos, 
         preguntas comunes y próximos pasos. Hazlo integral y educativo.`
  };
  
  return `${inputPrompts[aiLang]}${contextAddition[aiLang]}. ${outputInstructions[aiLang]} ${structureInstructions[aiLang]}`;
}

/**
 * Gets language-specific error messages for AI operations
 */
export function getErrorMessage(
  error: string,
  language: SupportedLanguage
): string {
  const errorMessages = {
    en: {
      'api_error': 'AI service temporarily unavailable. Please try again.',
      'network_error': 'Network connection error. Please check your internet connection.',
      'validation_error': 'Input validation failed. Please check your input.',
      'timeout_error': 'Request timed out. Please try again.',
      'default': 'An unexpected error occurred. Please try again.'
    },
    nl: {
      'api_error': 'AI-service tijdelijk niet beschikbaar. Probeer het opnieuw.',
      'network_error': 'Netwerkverbindingsfout. Controleer je internetverbinding.',
      'validation_error': 'Invoervalidatie mislukt. Controleer je invoer.',
      'timeout_error': 'Verzoek time-out. Probeer het opnieuw.',
      'default': 'Er is een onverwachte fout opgetreden. Probeer het opnieuw.'
    },
    es: {
      'api_error': 'Servicio de IA temporalmente no disponible. Inténtalo de nuevo.',
      'network_error': 'Error de conexión de red. Verifica tu conexión a internet.',
      'validation_error': 'Validación de entrada fallida. Verifica tu entrada.',
      'timeout_error': 'Tiempo de espera agotado. Inténtalo de nuevo.',
      'default': 'Ocurrió un error inesperado. Inténtalo de nuevo.'
    }
  };
  
  return errorMessages[language][error] || errorMessages[language].default;
}

/**
 * Gets loading messages in the specified language
 */
export function getLoadingMessage(
  operation: 'analyzing' | 'expanding' | 'generating' | 'loading',
  language: SupportedLanguage
): string {
  const loadingMessages = {
    en: {
      'analyzing': 'Analyzing topic...',
      'expanding': 'Expanding concept...',
      'generating': 'Generating content...',
      'loading': 'Loading...'
    },
    nl: {
      'analyzing': 'Onderwerp analyseren...',
      'expanding': 'Concept uitbreiden...',
      'generating': 'Inhoud genereren...',
      'loading': 'Laden...'
    },
    es: {
      'analyzing': 'Analizando tema...',
      'expanding': 'Expandiendo concepto...',
      'generating': 'Generando contenido...',
      'loading': 'Cargando...'
    }
  };
  
  return loadingMessages[language][operation];
}

// Backward compatibility functions with old signatures
export function getTopicAnalysisPromptLegacy(
  topic: string, 
  inputLang: SupportedLanguage, 
  outputLang: SupportedLanguage
): string {
  // Use the output language as the main AI language
  return getTopicAnalysisPrompt(topic, outputLang);
}

export function getConceptExpansionPromptLegacy(
  concept: string,
  parentTopic: string,
  inputLang: SupportedLanguage,
  outputLang: SupportedLanguage
): string {
  // Use the output language as the main AI language
  return getConceptExpansionPrompt(concept, parentTopic, outputLang);
}

export function getUrlAnalysisPromptLegacy(
  url: string,
  inputLang: SupportedLanguage,
  outputLang: SupportedLanguage
): string {
  // Use the output language as the main AI language
  return getUrlAnalysisPrompt(url, outputLang);
}

export function getContentGenerationPromptLegacy(
  topic: string,
  context: string | undefined,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  inputLang: SupportedLanguage,
  outputLang: SupportedLanguage
): string {
  // Use the output language as the main AI language
  return getContentGenerationPrompt(topic, context, difficulty, outputLang);
}