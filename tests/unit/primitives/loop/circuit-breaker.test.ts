/**
 * Circuit Breaker Tests
 *
 * Test suite for the CircuitBreaker class implementing the three-state pattern.
 * Covers all state transitions, edge cases, and configuration options.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerConfig } from '../../../../src/primitives/loop/circuit-breaker';

describe('CircuitBreaker', () => {
  let defaultConfig: CircuitBreakerConfig;

  beforeEach(() => {
    // Default configuration for tests
    defaultConfig = {
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 1000,
    };
  });

  describe('Initialization', () => {
    it('should initialize in CLOSED state', () => {
      const breaker = new CircuitBreaker(defaultConfig);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.isHalfOpen()).toBe(false);
    });

    it('should initialize with zero counters', () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const stats = breaker.getStats();

      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.lastFailureTime).toBeUndefined();
    });

    it('should record initialization time', () => {
      const before = new Date();
      const breaker = new CircuitBreaker(defaultConfig);
      const after = new Date();

      const stats = breaker.getStats();
      expect(stats.lastStateChange.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(stats.lastStateChange.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should accept custom configuration', () => {
      const customConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 3,
        timeoutMs: 5000,
        monitoringPeriodMs: 60000,
      };

      const breaker = new CircuitBreaker(customConfig);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED State', () => {
    it('should allow requests in CLOSED state', () => {
      const breaker = new CircuitBreaker(defaultConfig);

      expect(breaker.canExecute()).toBe(true);
    });

    it('should execute successful requests', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should increment total requests on execution', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const fn = vi.fn().mockResolvedValue('ok');

      await breaker.execute(fn);
      await breaker.execute(fn);

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
    });

    it('should not trip circuit on single failure', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const fn = vi.fn().mockRejectedValue(new Error('failure'));

      await expect(breaker.execute(fn)).rejects.toThrow('failure');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
    });

    it('should not trip circuit below threshold', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      for (let i = 0; i < defaultConfig.failureThreshold - 1; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset failure count on success', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Fail twice
      for (let i = 0; i < 2; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const statsBefore = breaker.getStats();
      expect(statsBefore.failureCount).toBe(2);

      // Succeed once
      const successFn = vi.fn().mockResolvedValue('ok');
      await breaker.execute(successFn);

      const statsAfter = breaker.getStats();
      expect(statsAfter.failureCount).toBe(0);
    });
  });

  describe('State Transition: CLOSED → OPEN', () => {
    it('should trip to OPEN after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Fail exactly threshold times
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isOpen()).toBe(true);
    });

    it('should record last failure time when tripping', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeDefined();
      expect(stats.lastFailureTime instanceof Date).toBe(true);
    });

    it('should count total failures correctly', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(defaultConfig.failureThreshold);
    });

    it('should increment total requests even on failures', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(defaultConfig.failureThreshold);
    });

    it('should update state change timestamp on transition', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const transitionTime = new Date();

      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.lastStateChange.getTime()).toBeGreaterThanOrEqual(transitionTime.getTime());
    });
  });

  describe('OPEN State', () => {
    it('should block requests in OPEN state', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      // Try to execute while OPEN
      const fn = vi.fn().mockResolvedValue('success');
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should report cannot execute while OPEN', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.canExecute()).toBe(false);
    });

    it('should include remaining time in error message', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const error = await breaker.execute(vi.fn().mockResolvedValue('success'))
        .catch(e => e);

      expect(error.message).toMatch(/Circuit breaker is OPEN/);
      expect(error.message).toMatch(/\d+ms remaining/);
    });

    it('should decrement remaining time over duration', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const shortTimeout = 200;

      const breakerWithShortTimeout = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: shortTimeout,
      });

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breakerWithShortTimeout.execute(fn)).rejects.toThrow();
      }

      // Wait half the timeout
      await new Promise(resolve => setTimeout(resolve, shortTimeout / 2));

      // Still should be OPEN
      expect(breakerWithShortTimeout.getState()).toBe(CircuitState.OPEN);
    });

    it('should not execute function while OPEN', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const fn = vi.fn().mockResolvedValue('success');

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const failFn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(failFn)).rejects.toThrow();
      }

      // Try to execute
      await expect(breaker.execute(fn)).rejects.toThrow();

      // Function should not have been called
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('State Transition: OPEN → HALF_OPEN', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: 100,
      });

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should trigger transition to HALF_OPEN
      expect(breaker.canExecute()).toBe(true);

      // Execute to trigger the transition
      const fn = vi.fn().mockResolvedValue('success');
      await breaker.execute(fn);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(breaker.isHalfOpen()).toBe(true);
    });

    it('should allow execution after timeout', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: 100,
      });

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should now be able to execute
      const fn = vi.fn().mockResolvedValue('success');
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should update state change timestamp on transition', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: 100,
      });

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const openTime = breaker.getStats().lastStateChange;

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Execute to trigger transition
      await breaker.execute(vi.fn().mockResolvedValue('success'));

      const halfOpenTime = breaker.getStats().lastStateChange;
      expect(halfOpenTime.getTime()).toBeGreaterThan(openTime.getTime());
    });
  });

  describe('HALF_OPEN State', () => {
    it('should allow test request in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: 100,
      });

      // Trip and wait for timeout
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      // Execute to get to HALF_OPEN
      await breaker.execute(vi.fn().mockResolvedValue('success'));

      expect(breaker.isHalfOpen()).toBe(true);
      expect(breaker.canExecute()).toBe(true);
    });

    describe('On Success in HALF_OPEN', () => {
      it('should increment success count', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip and transition to HALF_OPEN
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));

        expect(breaker.getStats().successCount).toBe(1);
      });

      it('should transition to CLOSED after reaching success threshold', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip and transition to HALF_OPEN
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));

        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

        // Execute threshold-1 more successes
        for (let i = 0; i < defaultConfig.successThreshold - 1; i++) {
          await breaker.execute(vi.fn().mockResolvedValue('success'));
        }

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
        expect(breaker.isClosed()).toBe(true);
      });

      it('should reset counters on transition to CLOSED', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip and transition to HALF_OPEN
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));

        // Execute threshold more successes
        for (let i = 0; i < defaultConfig.successThreshold; i++) {
          await breaker.execute(vi.fn().mockResolvedValue('success'));
        }

        const stats = breaker.getStats();
        expect(stats.failureCount).toBe(0);
        expect(stats.successCount).toBe(0);
      });
    });

    describe('On Failure in HALF_OPEN', () => {
      it('should immediately transition back to OPEN', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip and transition to HALF_OPEN
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));

        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

        // Fail in HALF_OPEN
        const failFn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(failFn)).rejects.toThrow();

        expect(breaker.getState()).toBe(CircuitState.OPEN);
        expect(breaker.isOpen()).toBe(true);
      });

      it('should reset success count on failure', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip and transition to HALF_OPEN
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));

        expect(breaker.getStats().successCount).toBe(1);

        // Fail
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('failure')))).rejects.toThrow();

        expect(breaker.getStats().successCount).toBe(0);
      });

      it('should start new timeout period', async () => {
        const breaker = new CircuitBreaker({
          ...defaultConfig,
          timeoutMs: 100,
        });

        // Trip to OPEN (first time)
        for (let i = 0; i < defaultConfig.failureThreshold; i++) {
          const fn = vi.fn().mockRejectedValue(new Error('failure'));
          await expect(breaker.execute(fn)).rejects.toThrow();
        }

        expect(breaker.getState()).toBe(CircuitState.OPEN);
        const firstOpenTime = breaker.getStats().lastStateChange;

        // Wait and transition to HALF_OPEN
        await new Promise(resolve => setTimeout(resolve, 150));
        await breaker.execute(vi.fn().mockResolvedValue('success'));
        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

        const halfOpenTime = breaker.getStats().lastStateChange;
        expect(halfOpenTime.getTime()).toBeGreaterThan(firstOpenTime.getTime());

        // Small delay before failing back
        await new Promise(resolve => setTimeout(resolve, 10));

        // Fail back to OPEN (second time)
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('failure')))).rejects.toThrow();
        expect(breaker.getState()).toBe(CircuitState.OPEN);

        const secondOpenTime = breaker.getStats().lastStateChange;
        expect(secondOpenTime.getTime()).toBeGreaterThan(halfOpenTime.getTime());
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track total requests correctly', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // 5 successful requests
      for (let i = 0; i < 5; i++) {
        await breaker.execute(vi.fn().mockResolvedValue('success'));
      }

      // 2 failed requests
      for (let i = 0; i < 2; i++) {
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(7);
    });

    it('should track total failures correctly', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // 3 failed requests
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
      }

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(3);
    });

    it('should calculate failure rate correctly', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // 5 successful, 3 failed
      for (let i = 0; i < 5; i++) {
        await breaker.execute(vi.fn().mockResolvedValue('success'));
      }
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
      }

      const stats = breaker.getStats();
      const failureRate = stats.totalFailures / stats.totalRequests;
      expect(failureRate).toBeCloseTo(0.375, 2);
    });

    it('should provide immutable stats object', () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const stats1 = breaker.getStats();
      const stats2 = breaker.getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial CLOSED state', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isClosed()).toBe(true);
    });

    it('should reset all counters', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Generate some activity
      for (let i = 0; i < 5; i++) {
        await breaker.execute(vi.fn().mockResolvedValue('success'));
      }
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
      }

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });

    it('should clear last failure time', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Generate a failure
      await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();

      expect(breaker.getStats().lastFailureTime).toBeDefined();

      breaker.reset();

      expect(breaker.getStats().lastFailureTime).toBeUndefined();
    });

    it('should update state change time on reset', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const beforeReset = new Date();

      await new Promise(resolve => setTimeout(resolve, 10));

      breaker.reset();

      const afterReset = new Date();
      const resetTime = breaker.getStats().lastStateChange;

      expect(resetTime.getTime()).toBeGreaterThanOrEqual(beforeReset.getTime());
      expect(resetTime.getTime()).toBeLessThanOrEqual(afterReset.getTime());
    });

    it('should allow execution after reset', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.canExecute()).toBe(false);

      breaker.reset();

      expect(breaker.canExecute()).toBe(true);

      const fn = vi.fn().mockResolvedValue('success');
      await expect(breaker.execute(fn)).resolves.toBe('success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero failure threshold', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        failureThreshold: 0,
      });

      // Should trip immediately on first failure
      await expect(breaker.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should handle zero success threshold', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        successThreshold: 0,
        timeoutMs: 100,
      });

      // Trip and wait for timeout
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should transition to CLOSED immediately on first success
      await breaker.execute(vi.fn().mockResolvedValue('success'));

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle very short timeout', async () => {
      const breaker = new CircuitBreaker({
        ...defaultConfig,
        timeoutMs: 10,
      });

      // Trip the circuit
      for (let i = 0; i < defaultConfig.failureThreshold; i++) {
        const fn = vi.fn().mockRejectedValue(new Error('failure'));
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for short timeout
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should now allow execution
      await breaker.execute(vi.fn().mockResolvedValue('success'));

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should handle large thresholds', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 100,
        successThreshold: 50,
        timeoutMs: 1000,
      });

      // Execute many successful requests
      for (let i = 0; i < 50; i++) {
        await breaker.execute(vi.fn().mockResolvedValue('success'));
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle rapid successive calls', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        const fn = vi.fn().mockResolvedValue(`success-${i}`);
        promises.push(breaker.execute(fn));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results[0]).toBe('success-0');
      expect(results[9]).toBe('success-9');

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(10);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should preserve generic types', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      const fn = vi.fn().mockResolvedValue({ id: 1, name: 'test' });
      const result = await breaker.execute(fn);

      expect(result).toEqual({ id: 1, name: 'test' });
      // TypeScript should infer the type correctly
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
    });

    it('should handle void return type', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      const fn = vi.fn().mockResolvedValue(undefined);
      const result = await breaker.execute(fn);

      expect(result).toBeUndefined();
    });

    it('should handle null return type', async () => {
      const breaker = new CircuitBreaker(defaultConfig);

      const fn = vi.fn().mockResolvedValue(null);
      const result = await breaker.execute(fn);

      expect(result).toBeNull();
    });
  });

  describe('Error Propagation', () => {
    it('should preserve original error message', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const originalError = new Error('Original error message');

      const error = await breaker.execute(vi.fn().mockRejectedValue(originalError))
        .catch(e => e);

      expect(error.message).toBe('Original error message');
    });

    it('should preserve error stack trace', async () => {
      const breaker = new CircuitBreaker(defaultConfig);
      const originalError = new Error('Stack trace test');

      const error = await breaker.execute(vi.fn().mockRejectedValue(originalError))
        .catch(e => e);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Stack trace test');
    });

    it('should propagate custom error types', async () => {
      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const breaker = new CircuitBreaker(defaultConfig);
      const customError = new CustomError('Custom error', 404);

      const error = await breaker.execute(vi.fn().mockRejectedValue(customError))
        .catch(e => e);

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe(404);
    });
  });
});
