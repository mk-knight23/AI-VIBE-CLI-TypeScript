import { CircuitBreaker } from './circuit-breaker.js';
import { VibeError, errors } from '../../utils/errors.js';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('resilience');

export interface ResilienceOptions {
    retries?: number;
    timeoutMs?: number;
    backoffFactor?: number;
    jitter?: boolean;
    circuitBreaker?: CircuitBreaker;
}

export class ResilienceManager {
    public static async wrap<T>(
        operationName: string,
        fn: () => Promise<T>,
        options: ResilienceOptions = {}
    ): Promise<T> {
        const {
            retries = 3,
            timeoutMs = 30000,
            backoffFactor = 2,
            jitter = true,
            circuitBreaker
        } = options;

        let lastError: any;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Apply Circuit Breaker if provided
                const executeFn = async () => {
                    return await this.withTimeout(fn, timeoutMs, operationName);
                };

                if (circuitBreaker) {
                    return await circuitBreaker.execute(executeFn);
                } else {
                    return await executeFn();
                }
            } catch (error: any) {
                lastError = error;

                // Don't retry if it's a "terminal" error (e.g. Invalid Input)
                if (this.isTerminalError(error)) {
                    throw error;
                }

                if (attempt < retries) {
                    const delay = this.calculateBackoff(attempt, backoffFactor, jitter);
                    logger.warn({
                        operation: operationName,
                        attempt: attempt + 1,
                        delay,
                        error: error.message
                    }, 'Operation failed, retrying...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    private static async withTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(errors.timeoutError(operationName, timeoutMs));
            }, timeoutMs);
        });

        try {
            return await Promise.race([fn(), timeoutPromise]);
        } finally {
            clearTimeout(timeoutHandle!);
        }
    }

    private static calculateBackoff(attempt: number, factor: number, jitter: boolean): number {
        const base = Math.pow(factor, attempt) * 1000;
        if (jitter) {
            return base + (Math.random() * 1000);
        }
        return base;
    }

    private static isTerminalError(error: any): boolean {
        // Add logic to detect errors that shouldn't be retried
        if (error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_INPUT') {
            return true;
        }
        return false;
    }
}
