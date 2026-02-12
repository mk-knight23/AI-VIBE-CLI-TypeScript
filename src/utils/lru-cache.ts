/**
 * LRU Cache Implementation
 * Least Recently Used cache with TTL support
 */

export interface LRUCacheConfig {
    maxSize: number;
    ttl?: number; // Time to live in milliseconds
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    accessCount: number;
    lastAccess: number;
}

export class LRUCache<K = string, V = unknown> {
    private cache: Map<K, CacheEntry<V>>;
    private readonly maxSize: number;
    private readonly ttl?: number;

    constructor(config: LRUCacheConfig) {
        this.cache = new Map();
        this.maxSize = config.maxSize;
        this.ttl = config.ttl;
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        // Check TTL
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return undefined;
        }

        // Update access metadata
        entry.accessCount++;
        entry.lastAccess = Date.now();

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    set(key: K, value: V): void {
        // Check if key exists
        const existing = this.cache.get(key);
        if (existing) {
            existing.value = value;
            existing.timestamp = Date.now();
            existing.lastAccess = Date.now();

            // Move to end
            this.cache.delete(key);
            this.cache.set(key, existing);
            return;
        }

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        // Add new entry
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            accessCount: 0,
            lastAccess: Date.now()
        });
    }

    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        // Clean expired entries first
        this.cleanup();
        return this.cache.size;
    }

    keys(): K[] {
        return Array.from(this.cache.keys());
    }

    values(): V[] {
        return Array.from(this.cache.entries())
            .filter(([_, entry]) => !this.isExpired(entry))
            .map(([_, entry]) => entry.value);
    }

    entries(): [K, V][] {
        return Array.from(this.cache.entries())
            .filter(([_, entry]) => !this.isExpired(entry))
            .map(([key, entry]) => [key, entry.value]);
    }

    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        misses: number;
        hits: number;
    } {
        let hits = 0;
        let misses = 0;

        for (const [_, entry] of this.cache.entries()) {
            hits += entry.accessCount;
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: hits / (hits + misses) || 0,
            hits,
            misses
        };
    }

    private isExpired(entry: CacheEntry<V>): boolean {
        if (!this.ttl) return false;
        return Date.now() - entry.timestamp > this.ttl;
    }

    private cleanup(): void {
        if (!this.ttl) return;

        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl!) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Remove expired entries and return count removed
     */
    evictExpired(): number {
        let removed = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Peek at a value without updating access metadata
     */
    peek(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }
}
