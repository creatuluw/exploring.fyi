/**
 * Animation utilities for optimistic UI updates
 */

import { cubicOut } from 'svelte/easing';

export interface AnimationOptions {
  duration?: number;
  easing?: (t: number) => number;
  delay?: number;
}

/**
 * Fade in replacement animation for optimistic content
 */
export function fadeInReplacement(
  element: HTMLElement, 
  options: AnimationOptions = {}
): void {
  const { duration = 300, easing = cubicOut, delay = 0 } = options;

  element.style.opacity = '0';
  element.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    element.style.transition = `opacity ${duration}ms ${easing.name}, transform ${duration}ms ${easing.name}`;
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, delay);
}

/**
 * Slide in animation for new mind map nodes
 */
export function slideInNodes(
  nodes: HTMLElement[], 
  options: AnimationOptions = {}
): void {
  const { duration = 400, delay = 0 } = options;
  
  nodes.forEach((node, index) => {
    const nodeDelay = delay + (index * 100); // Stagger by 100ms
    
    node.style.opacity = '0';
    node.style.transform = 'scale(0.8) translateY(20px)';
    
    setTimeout(() => {
      node.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      node.style.opacity = '1';
      node.style.transform = 'scale(1) translateY(0)';
    }, nodeDelay);
  });
}

/**
 * Morph placeholder to real content
 */
export function morphPlaceholder(
  placeholder: HTMLElement,
  realContent: HTMLElement,
  options: AnimationOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    const { duration = 500 } = options;
    
    // Position real content exactly over placeholder
    const rect = placeholder.getBoundingClientRect();
    realContent.style.position = 'absolute';
    realContent.style.top = `${rect.top}px`;
    realContent.style.left = `${rect.left}px`;
    realContent.style.width = `${rect.width}px`;
    realContent.style.height = `${rect.height}px`;
    realContent.style.opacity = '0';
    
    // Add to DOM
    document.body.appendChild(realContent);
    
    // Animate transition
    requestAnimationFrame(() => {
      placeholder.style.transition = `opacity ${duration}ms ease-out`;
      realContent.style.transition = `opacity ${duration}ms ease-out`;
      
      placeholder.style.opacity = '0';
      realContent.style.opacity = '1';
      
      setTimeout(() => {
        // Replace placeholder with real content
        placeholder.parentNode?.replaceChild(realContent, placeholder);
        
        // Reset styles
        realContent.style.position = '';
        realContent.style.top = '';
        realContent.style.left = '';
        realContent.style.width = '';
        realContent.style.height = '';
        
        resolve();
      }, duration);
    });
  });
}

/**
 * Smooth rollback animation
 */
export function rollbackAnimation(
  element: HTMLElement,
  options: AnimationOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    const { duration = 300 } = options;
    
    // Add error shake effect
    element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.transform = 'translateX(-10px)';
    
    setTimeout(() => {
      element.style.transform = 'translateX(10px)';
    }, duration / 4);
    
    setTimeout(() => {
      element.style.transform = 'translateX(0)';
    }, duration / 2);
    
    setTimeout(() => {
      element.style.opacity = '0.5';
    }, duration * 0.7);
    
    setTimeout(() => {
      element.style.opacity = '0';
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        resolve();
      }, 100);
    }, duration);
  });
}

/**
 * Pulse loading animation for placeholders
 */
export function pulseLoading(element: HTMLElement): () => void {
  element.style.animation = 'pulse 2s ease-in-out infinite';
  
  // Add CSS if not already present
  if (!document.querySelector('#optimistic-animations-style')) {
    const style = document.createElement('style');
    style.id = 'optimistic-animations-style';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      
      .skeleton-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }
      
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Return cleanup function
  return () => {
    element.style.animation = '';
  };
}

/**
 * Staggered appearance animation
 */
export function staggeredAppearance(
  elements: HTMLElement[],
  options: AnimationOptions = {}
): void {
  const { duration = 300, delay = 0 } = options;
  const staggerDelay = 100;
  
  elements.forEach((element, index) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, delay + (index * staggerDelay));
  });
}

export const optimisticAnimations = {
  fadeInReplacement,
  slideInNodes,
  morphPlaceholder,
  rollbackAnimation,
  pulseLoading,
  staggeredAppearance
};
