/**
 * Unit tests for cache utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Cache, LRUCache } from '../../../src/utils/cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ ttl: 1000, maxSize: 3 });
  });

  describe('get/set', () => {
    it('should store and retrieve value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should handle different types', () => {
      const numCache = new Cache<number>();
      numCache.set('num', 42);
      expect(numCache.get('num')).toBe(42);

      const objCache = new Cache<object>();
      objCache.set('obj', { a: 1 });
      expect(objCache.get('obj')).toEqual({ a: 1 });
    });
  });

  describe('TTL', () => {
    it('should expire entries after TTL', async () => {
      cache = new Cache<string>({ ttl: 50 });
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 60));
      expect(cache.get('key')).toBeUndefined();
    });

    it('should support custom TTL per entry', () => {
      cache.set('short', 'value1', 50);
      cache.set('long', 'value2', 500);
      expect(cache.get('short')).toBe('value1');
      expect(cache.get('long')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cache = new Cache<string>({ ttl: 10 });
      cache.set('key', 'value');
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.has('key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should return false for missing key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('getOrCompute', () => {
    it('should return cached value without computing', async () => {
      cache.set('key', 'cached');
      const compute = vi.fn().mockResolvedValue('computed');
      const result = await cache.getOrCompute('key', compute);
      expect(result).toBe('cached');
      expect(compute).not.toHaveBeenCalled();
    });

    it('should compute and cache missing value', async () => {
      const compute = vi.fn().mockResolvedValue('computed');
      const result = await cache.getOrCompute('key', compute);
      expect(result).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);

      // Should be cached now
      const result2 = await cache.getOrCompute('key', compute);
      expect(result2).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', async () => {
      cache.set('expired', 'value', 10);
      cache.set('valid', 'value', 1000);
      await new Promise(resolve => setTimeout(resolve, 20));

      const removed = cache.prune();
      expect(removed).toBe(1);
      expect(cache.get('expired')).toBeUndefined();
      expect(cache.get('valid')).toBe('value');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('maxSize', () => {
    it('should evict oldest entry when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key4')).toBe('value4');
    });
  });
});

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ ttl: 1000, maxSize: 3 });
  });

  it('should move accessed item to most recently used', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Access key1
    cache.get('key1');

    // Add new entry - should evict key2 (least recently used)
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });
});
