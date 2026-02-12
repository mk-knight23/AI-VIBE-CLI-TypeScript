import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitState } from '../../src/core/resilience/circuit-breaker';
import { ResilienceManager } from '../../src/core/resilience/resilience-manager';
import { VibeError, ErrorCode } from '../../src/utils/errors';

describe('Resilience Framework', () => {
    describe('CircuitBreaker', () => {
        it('should transition to OPEN after failures', async () => {
            const cb = new CircuitBreaker({
                name: 'test-cb',
                failureThreshold: 2,
                resetTimeoutMs: 100
            });

            const fail = async () => { throw new Error('fail'); };

            await expect(cb.execute(fail)).rejects.toThrow();
            await expect(cb.execute(fail)).rejects.toThrow();

            expect(cb.getState()).toBe(CircuitState.OPEN);
            await expect(cb.execute(fail)).rejects.toThrow('is OPEN');
        });

        it('should transition to HALF_OPEN after reset timeout', async () => {
            const cb = new CircuitBreaker({
                name: 'test-cb',
                failureThreshold: 1,
                resetTimeoutMs: 50
            });

            await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
            expect(cb.getState()).toBe(CircuitState.OPEN);

            await new Promise(resolve => setTimeout(resolve, 60));

            // Should allow one call in HALF_OPEN (which transitions from OPEN on reset timeout check)
            const success = async () => 'ok';
            const result = await cb.execute(success);
            expect(result).toBe('ok');
            expect(cb.getState()).toBe(CircuitState.CLOSED);
        });
    });

    describe('ResilienceManager', () => {
        it('should retry on failure', async () => {
            let calls = 0;
            const fn = async () => {
                calls++;
                if (calls < 2) throw new Error('temporary fail');
                return 'success';
            };

            const result = await ResilienceManager.wrap('test', fn, {
                retries: 2,
                jitter: false,
                timeoutMs: 1000
            });

            expect(result).toBe('success');
            expect(calls).toBe(2);
        });

        it('should throw timeout error', async () => {
            const slow = async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                return 'done';
            };

            await expect(ResilienceManager.wrap('slow-op', slow, {
                timeoutMs: 50,
                retries: 0
            })).rejects.toMatchObject({
                code: ErrorCode.TIMEOUT_ERROR
            });
        });

        it('should integrate with CircuitBreaker', async () => {
            const cb = new CircuitBreaker({
                name: 'integrated-cb',
                failureThreshold: 1,
                resetTimeoutMs: 1000
            });

            const fail = async () => { throw new Error('fail'); };

            await expect(ResilienceManager.wrap('op', fail, {
                retries: 0,
                circuitBreaker: cb
            })).rejects.toThrow();

            expect(cb.getState()).toBe(CircuitState.OPEN);
        });
    });
});
