"use strict";
/**
 * VIBE-CLI v12 - Cache Utility
 * In-memory caching with TTL support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = exports.Cache = void 0;
exports.createCache = createCache;
class Cache {
    store = new Map();
    defaultTTL;
    maxSize;
    hits = 0;
    misses = 0;
    constructor(options = {}) {
        this.defaultTTL = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
        this.maxSize = options.maxSize ?? 1000;
    }
    /**
     * Get a value from cache
     */
    get(key) {
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
    async getOrCompute(key, compute, ttl) {
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
    set(key, value, ttl) {
        // Evict oldest entry if at capacity
        if (this.store.size >= this.maxSize) {
            const oldestKey = this.findOldestKey();
            if (oldestKey)
                this.store.delete(oldestKey);
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
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Delete a key from cache
     */
    delete(key) {
        return this.store.delete(key);
    }
    /**
     * Clear all entries
     */
    clear() {
        this.store.clear();
    }
    /**
     * Remove expired entries
     */
    prune() {
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
    getStats() {
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
    getTTL(key) {
        const entry = this.store.get(key);
        if (!entry)
            return 0;
        return Math.max(0, entry.expiresAt - Date.now());
    }
    /**
     * Find the oldest key for eviction - can be overridden by subclasses
     */
    findOldestKey() {
        let oldest;
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
exports.Cache = Cache;
/**
 * Create a cache instance with sensible defaults
 */
function createCache(options) {
    return new Cache(options);
}
/**
 * LRU Cache implementation
 */
class LRUCache extends Cache {
    accessOrder = [];
    set(key, value, ttl) {
        // Remove from access order if exists
        const idx = this.accessOrder.indexOf(key);
        if (idx > -1)
            this.accessOrder.splice(idx, 1);
        // Add to end (most recently used)
        this.accessOrder.push(key);
        super.set(key, value, ttl);
    }
    get(key) {
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
    findOldestKey() {
        return this.accessOrder[0];
    }
}
exports.LRUCache = LRUCache;
//# sourceMappingURL=cache.js.map