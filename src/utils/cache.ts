/**
 * VIBE-CLI v12 - Cache Utility
 * In-memory caching with TTL support
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class Cache<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 1000;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Get a value from cache or compute it
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) this.store.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    maxSize: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get remaining TTL for a key (in milliseconds)
   */
  getTTL(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  /**
   * Find the oldest key for eviction - can be overridden by subclasses
   */
  protected findOldestKey(): string | undefined {
    let oldest: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = key;
      }
    }

    return oldest;
  }
}

/**
 * Create a cache instance with sensible defaults
 */
export function createCache<T = any>(options?: CacheOptions): Cache<T> {
  return new Cache<T>(options);
}

/**
 * LRU Cache implementation
 */
export class LRUCache<T = any> extends Cache<T> {
  private accessOrder: string[] = [];

  set(key: string, value: T, ttl?: number): void {
    // Remove from access order if exists
    const idx = this.accessOrder.indexOf(key);
    if (idx > -1) this.accessOrder.splice(idx, 1);

    // Add to end (most recently used)
    this.accessOrder.push(key);

    super.set(key, value, ttl);
  }

  get(key: string): T | undefined {
    const value = super.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      const idx = this.accessOrder.indexOf(key);
      if (idx > -1) {
        this.accessOrder.splice(idx, 1);
        this.accessOrder.push(key);
      }
    }
    return value;
  }

  protected findOldestKey(): string | undefined {
    return this.accessOrder[0];
  }
}
