export enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeoutMs: number;
    name: string;
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime?: number;
    private options: CircuitBreakerOptions;

    constructor(options: CircuitBreakerOptions) {
        this.options = options;
    }

    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
            } else {
                throw new Error(`Circuit Breaker "${this.options.name}" is OPEN`);
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

    private onSuccess() {
        this.failureCount = 0;
        this.state = CircuitState.CLOSED;
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }

    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return true;
        return Date.now() - this.lastFailureTime > this.options.resetTimeoutMs;
    }

    public getState(): CircuitState {
        return this.state;
    }
}
