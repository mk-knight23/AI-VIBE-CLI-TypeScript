import { describe, it, expect } from 'vitest';
import { withTimeout, withRetry, TimeoutError, TIMEOUTS } from '../../../src/utils/timeout';

describe('Timeout Utilities', () => {
  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const result = await withTimeout(
        Promise.resolve('success'),
        1000,
        'test'
      );
      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 500));
      
      await expect(
        withTimeout(slowPromise, 50, 'slow operation')
      ).rejects.toThrow(TimeoutError);
    });

    it('should include operation name in error', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 500));
      
      try {
        await withTimeout(slowPromise, 50, 'my operation');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as Error).message).toContain('my operation');
      }
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        return 'success';
      });
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      }, { maxRetries: 3, delayMs: 10 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      let attempts = 0;
      await expect(
        withRetry(async () => {
          attempts++;
          throw new Error('always fails');
        }, { maxRetries: 2, delayMs: 10 })
      ).rejects.toThrow('always fails');
      
      expect(attempts).toBe(2);
    });

    it('should call onRetry callback', async () => {
      const retries: number[] = [];
      
      try {
        await withRetry(async () => {
          throw new Error('fail');
        }, { 
          maxRetries: 3, 
          delayMs: 10,
          onRetry: (attempt) => retries.push(attempt)
        });
      } catch {}
      
      expect(retries).toEqual([1, 2]);
    });
  });

  describe('TIMEOUTS', () => {
    it('should have expected timeout values', () => {
      expect(TIMEOUTS.API_CALL).toBe(60000);
      expect(TIMEOUTS.TOOL_EXEC).toBe(30000);
      expect(TIMEOUTS.SHELL_CMD).toBe(120000);
    });
  });
});
