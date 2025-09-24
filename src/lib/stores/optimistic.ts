/**
 * Optimistic State Management
 * Handles optimistic UI updates with rollback capabilities
 */

interface OptimisticOperation<T> {
  id: string;
  optimisticUpdate: () => void;
  rollback: () => void;
  realOperation: () => Promise<T>;
  errorMessage?: string;
  timestamp: number;
}

export class OptimisticStore {
  private pendingOperations = new Map<string, OptimisticOperation<any>>();
  private rollbackHistory = new Map<string, any>();

  /**
   * Perform an optimistic update with automatic rollback on failure
   */
  async performOptimistic<T>(
    operationId: string,
    optimisticUpdate: () => void,
    realOperation: () => Promise<T>,
    rollback: () => void,
    errorMessage?: string
  ): Promise<T> {
    console.log(`🔄 [Optimistic] Starting operation: ${operationId}`);

    // Store the operation for potential rollback
    const operation: OptimisticOperation<T> = {
      id: operationId,
      optimisticUpdate,
      rollback,
      realOperation,
      errorMessage,
      timestamp: Date.now()
    };

    this.pendingOperations.set(operationId, operation);

    try {
      // 1. Apply optimistic update immediately
      optimisticUpdate();
      console.log(`✅ [Optimistic] Applied optimistic update: ${operationId}`);

      // 2. Perform real operation in background
      const result = await realOperation();
      console.log(`✅ [Optimistic] Real operation completed: ${operationId}`);

      // 3. Clean up successful operation
      this.pendingOperations.delete(operationId);
      
      return result;

    } catch (error) {
      console.error(`❌ [Optimistic] Operation failed, rolling back: ${operationId}`, error);

      // 4. Rollback optimistic changes
      try {
        rollback();
        console.log(`✅ [Optimistic] Rollback completed: ${operationId}`);
      } catch (rollbackError) {
        console.error(`❌ [Optimistic] Rollback failed: ${operationId}`, rollbackError);
      }

      // 5. Clean up failed operation
      this.pendingOperations.delete(operationId);

      // 6. Re-throw the original error
      throw error;
    }
  }

  /**
   * Check if an operation is currently pending
   */
  isPending(operationId: string): boolean {
    return this.pendingOperations.has(operationId);
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): string[] {
    return Array.from(this.pendingOperations.keys());
  }

  /**
   * Cancel a pending operation (perform rollback without waiting for completion)
   */
  cancelOperation(operationId: string): void {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      console.log(`🚫 [Optimistic] Cancelling operation: ${operationId}`);
      try {
        operation.rollback();
      } catch (error) {
        console.error(`❌ [Optimistic] Error during cancellation rollback: ${operationId}`, error);
      }
      this.pendingOperations.delete(operationId);
    }
  }

  /**
   * Clean up old pending operations (older than 30 seconds)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds

    for (const [id, operation] of this.pendingOperations) {
      if (now - operation.timestamp > maxAge) {
        console.warn(`⚠️ [Optimistic] Cleaning up stale operation: ${id}`);
        this.cancelOperation(id);
      }
    }
  }
}

// Global optimistic store instance
export const optimisticStore = new OptimisticStore();

// Auto-cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    optimisticStore.cleanup();
  }, 30000);
}
