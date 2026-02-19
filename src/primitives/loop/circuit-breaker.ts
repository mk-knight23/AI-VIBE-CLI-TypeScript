export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  monitoringPeriodMs?: number;
}

export interface CircuitBreakerStats {
  failureCount: number;
  successCount: number;
  totalRequests: number;
  totalFailures: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private lastFailureTime?: Date;
  private lastStateChange: Date;
  private openedAt?: number;

  constructor(private readonly config: CircuitBreakerConfig) {
    this.lastStateChange = new Date();
  }

  getState(): CircuitState {
    return this.state;
  }

  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    const elapsed = Date.now() - (this.openedAt ?? 0);
    return elapsed >= this.config.timeoutMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - (this.openedAt ?? 0);
      if (elapsed >= this.config.timeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        const remaining = this.config.timeoutMs - elapsed;
        throw new Error(`Circuit breaker is OPEN, ${remaining}ms remaining`);
      }
    }

    this.totalRequests++;
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime.getTime())
        : undefined,
      lastStateChange: new Date(this.lastStateChange.getTime()),
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.lastFailureTime = undefined;
    this.lastStateChange = new Date();
    this.openedAt = undefined;
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = new Date();
    if (newState === CircuitState.OPEN) {
      this.openedAt = Date.now();
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      this.failureCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = new Date();
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount = 0;
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }
}
