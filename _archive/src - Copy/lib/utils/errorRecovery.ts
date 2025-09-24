/**
 * Error Recovery Patterns for Optimistic UI
 */

import { optimisticStore } from '../stores/optimistic.js';
import { rollbackAnimation } from './animations.js';

export interface ErrorRecoveryOptions {
  errorMessage?: string;
  showToast?: boolean;
  logError?: boolean;
  retryable?: boolean;
  maxRetries?: number;
}

/**
 * Perform an operation with optimistic rollback on error
 */
export class ErrorRecovery {
  static async withOptimisticRollback<T>(
    operationId: string,
    optimisticUpdate: () => void,
    operation: () => Promise<T>,
    rollback: () => void,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const {
      errorMessage = 'Operation failed',
      showToast = true,
      logError = true,
      retryable = false,
      maxRetries = 0
    } = options;

    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        return await optimisticStore.performOptimistic(
          `${operationId}_attempt_${attempts}`,
          attempts === 0 ? optimisticUpdate : () => {}, // Only apply optimistic update on first attempt
          operation,
          rollback,
          errorMessage
        );
      } catch (error) {
        attempts++;
        
        if (logError) {
          console.error(`❌ [ErrorRecovery] Attempt ${attempts} failed for ${operationId}:`, error);
        }
        
        if (attempts <= maxRetries && retryable) {
          console.log(`🔄 [ErrorRecovery] Retrying ${operationId} (${attempts}/${maxRetries})`);
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          continue;
        }
        
        // Final failure
        if (showToast) {
          this.showErrorToast(errorMessage);
        }
        
        throw error;
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries} retries`);
  }

  /**
   * Show error toast notification
   */
  private static showErrorToast(message: string): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  /**
   * Handle network-specific errors with appropriate recovery
   */
  static async withNetworkRecovery<T>(
    operationId: string,
    optimisticUpdate: () => void,
    operation: () => Promise<T>,
    rollback: () => void
  ): Promise<T> {
    return this.withOptimisticRollback(
      operationId,
      optimisticUpdate,
      operation,
      rollback,
      {
        errorMessage: 'Network error. Please check your connection and try again.',
        retryable: true,
        maxRetries: 2,
        showToast: true
      }
    );
  }

  /**
   * Handle database-specific errors with appropriate recovery
   */
  static async withDatabaseRecovery<T>(
    operationId: string,
    optimisticUpdate: () => void,
    operation: () => Promise<T>,
    rollback: () => void
  ): Promise<T> {
    return this.withOptimisticRollback(
      operationId,
      optimisticUpdate,
      operation,
      rollback,
      {
        errorMessage: 'Database temporarily unavailable. Changes have been reverted.',
        retryable: true,
        maxRetries: 1,
        showToast: true
      }
    );
  }

  /**
   * Handle AI service errors with appropriate recovery
   */
  static async withAIServiceRecovery<T>(
    operationId: string,
    optimisticUpdate: () => void,
    operation: () => Promise<T>,
    rollback: () => void
  ): Promise<T> {
    return this.withOptimisticRollback(
      operationId,
      optimisticUpdate,
      operation,
      rollback,
      {
        errorMessage: 'AI service temporarily unavailable. Please try again.',
        retryable: false, // AI operations are expensive, don't auto-retry
        showToast: true
      }
    );
  }

  /**
   * Create a rollback function that includes visual feedback
   */
  static createVisualRollback(
    element: HTMLElement | null,
    dataRollback: () => void
  ): () => void {
    return () => {
      // Perform data rollback
      dataRollback();
      
      // Add visual feedback if element exists
      if (element) {
        rollbackAnimation(element).catch(console.warn);
      }
    };
  }
}

/**
 * Debounced error recovery for rapid-fire operations
 */
export class DebouncedErrorRecovery {
  private timers = new Map<string, NodeJS.Timeout>();
  private pendingOperations = new Map<string, () => Promise<any>>();

  async performDebounced<T>(
    operationId: string,
    operation: () => Promise<T>,
    delay: number = 500
  ): Promise<T> {
    // Clear existing timer
    const existingTimer = this.timers.get(operationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve, reject) => {
      // Store the operation
      this.pendingOperations.set(operationId, operation);

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          const result = await operation();
          this.timers.delete(operationId);
          this.pendingOperations.delete(operationId);
          resolve(result);
        } catch (error) {
          this.timers.delete(operationId);
          this.pendingOperations.delete(operationId);
          reject(error);
        }
      }, delay);

      this.timers.set(operationId, timer);
    });
  }

  cancel(operationId: string): void {
    const timer = this.timers.get(operationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(operationId);
      this.pendingOperations.delete(operationId);
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingOperations.clear();
  }
}

// Global debounced recovery instance
export const debouncedRecovery = new DebouncedErrorRecovery();
