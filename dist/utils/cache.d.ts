/**
 * VIBE-CLI v12 - Cache Utility
 * In-memory caching with TTL support
 */
interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export declare class Cache<T = any> {
    private store;
    private defaultTTL;
    private maxSize;
    private hits;
    private misses;
    constructor(options?: CacheOptions);
    /**
     * Get a value from cache
     */
    get(key: string): T | undefined;
    /**
     * Get a value from cache or compute it
     */
    getOrCompute(key: string, compute: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Set a value in cache
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Check if a key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete a key from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Remove expired entries
     */
    prune(): number;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
        maxSize: number;
    };
    /**
     * Get remaining TTL for a key (in milliseconds)
     */
    getTTL(key: string): number;
    /**
     * Find the oldest key for eviction - can be overridden by subclasses
     */
    protected findOldestKey(): string | undefined;
}
/**
 * Create a cache instance with sensible defaults
 */
export declare function createCache<T = any>(options?: CacheOptions): Cache<T>;
/**
 * LRU Cache implementation
 */
export declare class LRUCache<T = any> extends Cache<T> {
    private accessOrder;
    set(key: string, value: T, ttl?: number): void;
    get(key: string): T | undefined;
    protected findOldestKey(): string | undefined;
}
export {};
//# sourceMappingURL=cache.d.ts.map