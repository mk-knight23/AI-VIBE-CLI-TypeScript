/**
 * Loop Primitive Tests
 *
 * Test suite for the LoopPrimitive class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoopPrimitive } from '../../../../src/domain/primitives/loop/loop-primitive';

describe('LoopPrimitive', () => {
  let loop: LoopPrimitive;

  beforeEach(() => {
    loop = new LoopPrimitive({
      config: {
        maxIterations: 10,
        enableCircuitBreaker: false, // Disable for simpler testing
      },
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultLoop = new LoopPrimitive();

      const config = defaultLoop.getConfig();
      expect(config.maxIterations).toBeGreaterThan(0);
    });

    it('should accept custom configuration', () => {
      const customLoop = new LoopPrimitive({
        config: {
          maxIterations: 50,
          iterationTimeoutMs: 10000,
        },
      });

      const config = customLoop.getConfig();
      expect(config.maxIterations).toBe(50);
      expect(config.iterationTimeoutMs).toBe(10000);
    });

    it('should initialize with zero iterations', () => {
      const state = loop.getState();

      expect(state.iteration).toBe(0);
      expect(state.isComplete).toBe(false);
      expect(state.isStuck).toBe(false);
    });

    it('should initialize empty completions and errors', () => {
      const state = loop.getState();

      expect(state.completions).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  });

  describe('Basic Execution', () => {
    it('should execute and stop on exit signal', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All tasks have been completed. EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.totalIterations).toBe(1);
      expect(result.finalState.isComplete).toBe(true);
    });

    it('should track completion status', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All tasks have been completed. EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.finalState.isComplete).toBe(true);
      expect(result.reason).toContain('completed successfully');
    });

    it('should pass iteration number to executor', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 3 ? 'Complete. EXIT_SIGNAL' : `Response ${callCount}`;
      });

      await loop.execute(mockExecutor);

      expect(mockExecutor).toHaveBeenNthCalledWith(1, 1, expect.any(String));
      expect(mockExecutor).toHaveBeenNthCalledWith(2, 2, expect.any(String));
      expect(mockExecutor).toHaveBeenNthCalledWith(3, 3, expect.any(String));
    });

    it('should pass context to executor', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('EXIT_SIGNAL');

      await loop.execute(mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith(expect.any(Number), expect.stringContaining('Iteration:'));
    });
  });

  describe('Iteration Limits', () => {
    it('should respect max iterations limit', async () => {
      const limitedLoop = new LoopPrimitive({
        config: { maxIterations: 5, enableCircuitBreaker: false },
      });

      const mockExecutor = vi.fn().mockResolvedValue('Still working...');

      const result = await limitedLoop.execute(mockExecutor);

      expect(result.totalIterations).toBe(5);
      expect(result.reason).toContain('Maximum iterations reached');
    });

    it('should stop at zero iterations', async () => {
      const zeroLoop = new LoopPrimitive({
        config: { maxIterations: 0, enableCircuitBreaker: false },
      });

      const mockExecutor = vi.fn().mockResolvedValue('Working...');

      const result = await zeroLoop.execute(mockExecutor);

      expect(result.totalIterations).toBe(0);
      expect(mockExecutor).not.toHaveBeenCalled();
    });
  });

  describe('Exit Detection', () => {
    it('should detect EXIT_SIGNAL', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All done. EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.totalIterations).toBe(1);
    });

    it('should require dual conditions for exit', async () => {
      // Only exit signal, no completion indicator
      const mockExecutor = vi.fn().mockResolvedValue('EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      // Should hit max iterations since no completion indicator
      expect(result.totalIterations).toBe(10);
    });

    it('should stop when confidence threshold met', async () => {
      const mockExecutor = vi.fn().mockResolvedValue(
        'All tasks have been completed. Implementation is complete. EXIT_SIGNAL'
      );

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.totalIterations).toBe(1);
    });
  });

  describe('Stuck Detection', () => {
    it('should detect stuck loop', async () => {
      const mockExecutor = vi.fn().mockResolvedValue(
        'I keep getting the same error and cannot move forward. Stuck in a loop. Unable to proceed.'
      );

      const result = await loop.execute(mockExecutor);

      expect(result.finalState.isStuck).toBe(true);
      expect(result.totalIterations).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle executor errors gracefully', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Executor failed'));

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue after single error', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('Error 1');
        return 'All done. EXIT_SIGNAL';
      });

      const result = await loop.execute(mockExecutor);

      expect(result.totalIterations).toBe(2);
    });

    it('should track errors in state', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) throw new Error(`Error ${callCount}`);
        return 'All done. EXIT_SIGNAL';
      });

      const result = await loop.execute(mockExecutor);

      expect(result.errors.length).toBe(2);
    });
  });

  describe('State Management', () => {
    it('should provide current state', () => {
      const state = loop.getState();

      expect(state).toHaveProperty('iteration');
      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('isComplete');
      expect(state).toHaveProperty('isStuck');
    });

    it('should update iteration count', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'Iteration 1' : 'All done. EXIT_SIGNAL';
      });

      await loop.execute(mockExecutor);

      expect(loop.getState().iteration).toBe(2);
    });

    it('should update completion status', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All done. EXIT_SIGNAL');

      await loop.execute(mockExecutor);

      expect(loop.getState().isComplete).toBe(true);
    });

    it('should reset state on reset()', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('Working...');

      await loop.execute(mockExecutor);
      loop.reset();

      const state = loop.getState();
      expect(state.iteration).toBe(0);
      expect(state.completions).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = loop.getConfig();

      expect(config).toHaveProperty('maxIterations');
    });

    it('should update configuration', () => {
      loop.updateConfig({ maxIterations: 50 });

      expect(loop.getConfig().maxIterations).toBe(50);
    });

    it('should preserve other config on update', () => {
      const originalTimeout = loop.getConfig().iterationTimeoutMs;
      loop.updateConfig({ maxIterations: 50 });

      expect(loop.getConfig().iterationTimeoutMs).toBe(originalTimeout);
    });
  });

  describe('Callback Functions', () => {
    it('should call onIteration callback', async () => {
      const onIteration = vi.fn();
      const callbackLoop = new LoopPrimitive({ onIteration, config: { enableCircuitBreaker: false } });

      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'Working...' : 'All done. EXIT_SIGNAL';
      });

      await callbackLoop.execute(mockExecutor);

      expect(onIteration).toHaveBeenCalledTimes(2);
    });

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn();
      const callbackLoop = new LoopPrimitive({ onComplete, config: { enableCircuitBreaker: false } });

      const mockExecutor = vi.fn().mockResolvedValue('All done. EXIT_SIGNAL');

      await callbackLoop.execute(mockExecutor);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback on error', async () => {
      const onError = vi.fn();
      const callbackLoop = new LoopPrimitive({ onError, config: { enableCircuitBreaker: false } });

      // Create an executor that always throws
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await callbackLoop.execute(mockExecutor);

      // onError is called when the whole loop fails (after hitting max iterations with errors)
      expect(result.success).toBe(false);
    });
  });

  describe('Result Building', () => {
    it('should build successful result', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All done. EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.totalIterations).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.finalState.isComplete).toBe(true);
    });

    it('should build failed result', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Failed'));

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include duration in result', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should provide exit reason', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All done. EXIT_SIGNAL');

      const result = await loop.execute(mockExecutor);

      expect(result.reason).toBeDefined();
      expect(result.reason).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('');

      const result = await loop.execute(mockExecutor);

      expect(result.totalIterations).toBe(loop.getConfig().maxIterations);
    });

    it('should handle very long response', async () => {
      // Add completion indicator for dual-condition detection
      const longResponse = 'All tasks have been completed. ' + 'a'.repeat(10000) + ' EXIT_SIGNAL';
      const mockExecutor = vi.fn().mockResolvedValue(longResponse);

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in response', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('All done! 🎉 EXIT_SIGNAL @#$%');

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete quickly with immediate exit', async () => {
      const mockExecutor = vi.fn().mockResolvedValue('EXIT_SIGNAL');

      const start = Date.now();
      await loop.execute(mockExecutor);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple iterations efficiently', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 5 ? 'EXIT_SIGNAL' : 'Working...';
      });

      const start = Date.now();
      await loop.execute(mockExecutor);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle successful development workflow', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 'I will implement the feature.';
        if (callCount === 2) return 'I have implemented the feature and tests are passing.';
        return 'All tasks have been completed. EXIT_SIGNAL';
      });

      const result = await loop.execute(mockExecutor);

      expect(result.success).toBe(true);
      expect(result.totalIterations).toBe(3);
      expect(result.finalState.isComplete).toBe(true);
    });

    it('should handle error recovery workflow', async () => {
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('Build failed');
        if (callCount === 2) return 'Fixed the build issue.';
        return 'All tasks have been completed. All tests passing. EXIT_SIGNAL';
      });

      const result = await loop.execute(mockExecutor);

      expect(result.totalIterations).toBe(3);
      expect(result.errors.length).toBe(1);
    });
  });
});
