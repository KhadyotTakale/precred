/**
 * Global API Rate Limiter
 * 
 * Provides request queuing with rate limiting to prevent 429 errors.
 * Features:
 * - Concurrent request limiting
 * - Minimum delay between requests
 * - Automatic backoff on 429 responses
 * - Request deduplication for identical concurrent requests
 * - Visual feedback via toast on backoff
 */

interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  key?: string; // Optional deduplication key
  priority?: number; // Higher priority = executed first
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// Callback for UI notifications
type BackoffCallback = (isBackingOff: boolean, remainingMs: number) => void;
let backoffCallback: BackoffCallback | null = null;

export function setBackoffCallback(callback: BackoffCallback | null): void {
  backoffCallback = callback;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class APIRateLimiter {
  private queue: QueuedRequest[] = [];
  private activeRequests = 0;
  private lastRequestTime = 0;
  private backoffUntil = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  
  // Configuration
  private maxConcurrent = 4; // Max simultaneous requests
  private minDelay = 50; // Minimum ms between requests
  private backoffMultiplier = 2;
  private initialBackoff = 1000; // 1 second initial backoff
  private maxBackoff = 30000; // 30 seconds max backoff
  private currentBackoff = this.initialBackoff;
  private dedupeWindow = 100; // ms window for request deduplication

  constructor(config?: {
    maxConcurrent?: number;
    minDelay?: number;
    initialBackoff?: number;
    maxBackoff?: number;
    dedupeWindow?: number;
  }) {
    if (config?.maxConcurrent) this.maxConcurrent = config.maxConcurrent;
    if (config?.minDelay) this.minDelay = config.minDelay;
    if (config?.initialBackoff) this.initialBackoff = config.initialBackoff;
    if (config?.maxBackoff) this.maxBackoff = config.maxBackoff;
    if (config?.dedupeWindow) this.dedupeWindow = config.dedupeWindow;
    this.currentBackoff = this.initialBackoff;
  }

  /**
   * Queue a request for rate-limited execution
   * @param execute - Function that returns a promise (the actual fetch)
   * @param options - Optional configuration for this request
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    options?: {
      key?: string; // Deduplication key - identical keys within dedupeWindow share the same request
      priority?: number; // Higher = executed first (default: 0)
      bypassQueue?: boolean; // Skip queue entirely (use sparingly)
    }
  ): Promise<T> {
    // Bypass queue if requested (for critical auth requests)
    if (options?.bypassQueue) {
      return execute();
    }

    // Check for duplicate request within dedup window
    if (options?.key) {
      const pending = this.pendingRequests.get(options.key);
      if (pending && Date.now() - pending.timestamp < this.dedupeWindow) {
        console.debug(`[RateLimiter] Deduplicating request: ${options.key}`);
        return pending.promise as Promise<T>;
      }
    }

    // Create the queued request
    const promise = new Promise<T>((resolve, reject) => {
      const request: QueuedRequest = {
        execute,
        resolve,
        reject,
        key: options?.key,
        priority: options?.priority ?? 0,
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex(
        (r) => (r.priority ?? 0) < (request.priority ?? 0)
      );
      
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }
    });

    // Track for deduplication
    if (options?.key) {
      this.pendingRequests.set(options.key, {
        promise,
        timestamp: Date.now(),
      });
    }

    // Start processing
    this.processQueue();

    return promise;
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    if (this.activeRequests >= this.maxConcurrent) {
      return;
    }

    // Check if we're in backoff period
    const now = Date.now();
    if (now < this.backoffUntil) {
      const waitTime = this.backoffUntil - now;
      console.debug(`[RateLimiter] In backoff, waiting ${waitTime}ms`);
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    // Check minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    // Get next request from queue
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // Execute the request
    this.activeRequests++;
    this.lastRequestTime = Date.now();

    try {
      const result = await request.execute();
      
      // Success - reset backoff
      this.currentBackoff = this.initialBackoff;
      
      request.resolve(result);
    } catch (error: any) {
      // Check for rate limit error
      if (this.isRateLimitError(error)) {
        console.warn(`[RateLimiter] Rate limit hit, backing off for ${this.currentBackoff}ms`);
        
        // Set backoff period
        this.backoffUntil = Date.now() + this.currentBackoff;
        
        // Notify UI about backoff
        if (backoffCallback) {
          backoffCallback(true, this.currentBackoff);
        }
        
        // Increase backoff for next time (exponential)
        this.currentBackoff = Math.min(
          this.currentBackoff * this.backoffMultiplier,
          this.maxBackoff
        );
        
        // Re-queue the request at high priority
        this.queue.unshift({
          ...request,
          priority: (request.priority ?? 0) + 100,
        });
      } else {
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
      
      // Clean up dedup tracking
      if (request.key) {
        // Remove after a short delay to handle race conditions
        setTimeout(() => {
          const pending = this.pendingRequests.get(request.key!);
          if (pending && Date.now() - pending.timestamp > this.dedupeWindow) {
            this.pendingRequests.delete(request.key!);
          }
        }, this.dedupeWindow * 2);
      }
    }

    // Process next request
    this.processQueue();
  }

  private isRateLimitError(error: any): boolean {
    // Check for 429 status in various error formats
    if (error?.status === 429) return true;
    if (error?.response?.status === 429) return true;
    if (error?.message?.includes('429')) return true;
    if (error?.message?.toLowerCase().includes('rate limit')) return true;
    if (error?.message?.toLowerCase().includes('too many requests')) return true;
    return false;
  }

  /**
   * Get current queue statistics
   */
  getStats(): {
    queueLength: number;
    activeRequests: number;
    isBackingOff: boolean;
    backoffRemaining: number;
  } {
    const now = Date.now();
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      isBackingOff: now < this.backoffUntil,
      backoffRemaining: Math.max(0, this.backoffUntil - now),
    };
  }

  /**
   * Clear the queue (pending requests will be rejected)
   */
  clearQueue(): void {
    const error = new Error('Request cancelled - queue cleared');
    this.queue.forEach((request) => request.reject(error));
    this.queue = [];
    this.pendingRequests.clear();
  }

  /**
   * Reset backoff (useful after user action)
   */
  resetBackoff(): void {
    this.backoffUntil = 0;
    this.currentBackoff = this.initialBackoff;
  }
}

// Create singleton instance with sensible defaults for Xano API
export const apiRateLimiter = new APIRateLimiter({
  maxConcurrent: 4,
  minDelay: 50,
  initialBackoff: 1000,
  maxBackoff: 30000,
  dedupeWindow: 100,
});

// Export class for custom instances if needed
export { APIRateLimiter };
