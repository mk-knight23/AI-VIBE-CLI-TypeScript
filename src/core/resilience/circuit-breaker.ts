/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by detecting failures and preventing further calls
 */

export interface CircuitBreakerConfig {
    failureThreshold: number;  // Number of failures before opening circuit
    resetTimeout: number;     // Time in ms before attempting to close
    halfOpenRequests?: number; // Number of requests to allow when half-open
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: CircuitBreakerState = 'closed';
    private failures: number = 0;
    private lastFailure: number = 0;
    private halfOpenAttempts: number = 0;

    constructor(private config: CircuitBreakerConfig) { }

    getState(): CircuitBreakerState {
        return this.state;
    }

    isOpen(): boolean {
        return this.state === 'open';
    }

    isClosed(): boolean {
        return this.state === 'closed';
    }

    isHalfOpen(): boolean {
        return this.state === 'half-open';
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailure >= this.config.resetTimeout) {
                this.transitionTo('half-open');
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    recordSuccess(): void {
        this.onSuccess();
    }

    recordFailure(): void {
        this.onFailure();
    }

    private onSuccess(): void {
        this.failures = 0;

        if (this.state === 'half-open') {
            this.transitionTo('closed');
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailure = Date.now();

        if (this.failures >= this.config.failureThreshold) {
            this.transitionTo('open');
        }
    }

    private transitionTo(newState: CircuitBreakerState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === 'half-open') {
            this.halfOpenAttempts = 0;
        }

        console.log(`Circuit breaker transitioned: ${oldState} → ${newState}`);
    }

    reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.lastFailure = 0;
        this.halfOpenAttempts = 0;
    }

    getMetrics(): {
        state: CircuitBreakerState;
        failures: number;
        lastFailure: number | null;
    } {
        return {
            state: this.state,
            failures: this.failures,
            lastFailure: this.lastFailure || null
        };
    }
}
