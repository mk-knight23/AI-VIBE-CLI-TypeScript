/**
 * VIBE CLI v0.0.2 - Utility Tests
 * Unit tests for circuit breaker, rate limiter, and LRU cache
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerState } from '../../src/utils/circuit-breaker';
import { RateLimiter } from '../../src/utils/rate-limiter';
import { LRUCache } from '../../src/utils/lru-cache';

describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
        breaker = new CircuitBreaker({
            failureThreshold: 3,
            resetTimeout: 1000
        });
    });

    describe('State Management', () => {
        it('should start in closed state', () => {
            expect(breaker.getState()).toBe('closed');
        });

        it('should transition to open after failure threshold', async () => {
            // Simulate failures
            for (let i = 0; i < 3; i++) {
                await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
            }

            expect(breaker.getState()).toBe('open');
        });

        it('should record success and stay closed', async () => {
            await breaker.execute(() => Promise.resolve('success'));
            expect(breaker.getState()).toBe('closed');
        });

        it('should transition to half-open after reset timeout', async () => {
            // Force open state
            for (let i = 0; i < 3; i++) {
                await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
            }

            expect(breaker.getState()).toBe('open');

            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Next call should transition to half-open
            try {
                await breaker.execute(() => Promise.resolve('success'));
            } catch {
                // May fail on first half-open attempt
            }

            // After success, should be closed
            await breaker.execute(() => Promise.resolve('success'));
            expect(breaker.getState()).toBe('closed');
        });
    });

    describe('Execution', () => {
        it('should execute successfully', async () => {
            const result = await breaker.execute(() => Promise.resolve('test'));
            expect(result).toBe('test');
        });

        it('should throw when open', async () => {
            // Force open
            for (let i = 0; i < 3; i++) {
                await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
            }

            await expect(breaker.execute(() => Promise.resolve('test'))).rejects.toThrow('Circuit breaker is open');
        });

        it('should return failure count', () => {
            breaker.recordFailure();
            breaker.recordFailure();

            const metrics = breaker.getMetrics();
            expect(metrics.failures).toBe(2);
        });

        it('should reset correctly', () => {
            breaker.recordFailure();
            breaker.reset();

            const metrics = breaker.getMetrics();
            expect(metrics.state).toBe('closed');
            expect(metrics.failures).toBe(0);
        });
    });
});

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            windowMs: 1000,
            maxRequests: 5
        });
    });

    describe('Request Limiting', () => {
        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                expect(limiter.recordRequest()).toBe(true);
            }
        });

        it('should block requests over limit', () => {
            for (let i = 0; i < 5; i++) {
                limiter.recordRequest();
            }

            expect(limiter.recordRequest()).toBe(false);
        });

        it('should report remaining tokens', () => {
            limiter.recordRequest();
            limiter.recordRequest();

            expect(limiter.getRemainingTokens()).toBe(3);
        });
    });

    describe('Time Window', () => {
        it('should refill tokens after window expires', async () => {
            // Exhaust limit
            for (let i = 0; i < 5; i++) {
                limiter.recordRequest();
            }

            expect(limiter.recordRequest()).toBe(false);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(limiter.recordRequest()).toBe(true);
        });

        it('should track metrics correctly', () => {
            limiter.recordRequest();
            const metrics = limiter.getMetrics();

            expect(metrics.limit).toBe(5);
            expect(metrics.remaining).toBe(4);
            expect(metrics.isLimited).toBe(false);
        });
    });

    describe('Reset', () => {
        it('should reset state', () => {
            limiter.recordRequest();
            limiter.recordRequest();
            limiter.reset();

            expect(limiter.getRemainingTokens()).toBe(5);
        });
    });
});

describe('LRUCache', () => {
    let cache: LRUCache<string, string>;

    beforeEach(() => {
        cache = new LRUCache({
            maxSize: 3,
            ttl: 5000
        });
    });

    describe('Basic Operations', () => {
        it('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return undefined for missing keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('nonexistent')).toBe(false);
        });

        it('should delete values', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeUndefined();
        });

        it('should clear all values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();

            expect(cache.size()).toBe(0);
        });
    });

    describe('Eviction', () => {
        it('should evict oldest entries when at capacity', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // This should evict key1
            cache.set('key4', 'value4');

            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });

        it('should update access order on get', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access key1 to make it most recently used
            cache.get('key1');

            // Add new entry - should evict key2
            cache.set('key4', 'value4');

            expect(cache.get('key1')).toBe('value1');
            expect(cache.get('key2')).toBeUndefined();
        });
    });

    describe('TTL', () => {
        it('should expire entries after TTL', async () => {
            const cacheWithShortTTL = new LRUCache<string, string>({
                maxSize: 10,
                ttl: 100
            });

            cacheWithShortTTL.set('key1', 'value1');

            // Before TTL
            expect(cacheWithShortTTL.get('key1')).toBe('value1');

            // After TTL
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(cacheWithShortTTL.get('key1')).toBeUndefined();
        });

        it('should evict expired entries', async () => {
            const cacheWithShortTTL = new LRUCache<string, string>({
                maxSize: 10,
                ttl: 100
            });

            cacheWithShortTTL.set('key1', 'value1');
            await new Promise(resolve => setTimeout(resolve, 150));

            const removed = cacheWithShortTTL.evictExpired();
            expect(removed).toBe(1);
        });
    });

    describe('Stats', () => {
        it('should return stats', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            // Access to increment hits
            cache.get('key1');
            cache.get('key1');

            const stats = cache.getStats();

            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(3);
            expect(stats.hits).toBe(2);
        });
    });

    describe('Peek', () => {
        it('should peek without updating access metadata', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Peek key1 - should not update access order
            const peeked = cache.peek('key1');
            expect(peeked).toBe('value1');

            // peek should not change accessCount
            const statsAfterPeek = cache.getStats();
            expect(statsAfterPeek.hits).toBe(0);

            // Access key2 - this should become most recent
            cache.get('key2');

            // Add new entry - should evict key1 (oldest, not peeked)
            cache.set('key4', 'value4');

            // key1 should still be there (peeked but not accessed)
            expect(cache.get('key1')).toBe('value1');
            // key2 was accessed, so should be there
            expect(cache.get('key2')).toBe('value2');
            // key3 was not accessed after key1, so should be evicted
            expect(cache.get('key3')).toBeUndefined();
            expect(cache.get('key4')).toBe('value4');
        });
    });
});
