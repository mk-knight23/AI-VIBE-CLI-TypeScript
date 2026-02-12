/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents runaway loops by implementing a three-state pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail immediately
 * - HALF_OPEN: Testing if system has recovered
 *
 * State Transitions:
 * CLOSED → OPEN: When failure threshold reached
 * OPEN → HALF_OPEN: After cooldown period expires
 * HALF_OPEN → CLOSED: On successful request
 * HALF_OPEN → OPEN: On failed request
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before tripping
  successThreshold: number;     // Successes to close circuit
  timeoutMs: number;            // Cooldown period in OPEN state
  monitoringPeriodMs?: number;  // Optional: reset failures after period
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
  totalRequests: number;
  totalFailures: number;
}

/**
 * Circuit Breaker for preventing runaway loops
 */
export class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private lastFailureTime?: Date;
  private lastStateChange: Date;
  private totalRequests: number;
  private totalFailures: number;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = new Date();
    this.totalRequests = 0;
    this.totalFailures = 0;
  }

  /**
   * Execute a function through the circuit breaker
   * @throws Error if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastChange = Date.now() - this.lastStateChange.getTime();

      if (timeSinceLastChange >= this.config.timeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new Error(
          `Circuit breaker is OPEN. ${this.config.timeoutMs - timeSinceLastChange}ms remaining`
        );
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

  /**
   * Check if circuit is allowing requests
   */
  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceLastChange = Date.now() - this.lastStateChange.getTime();
      return timeSinceLastChange >= this.config.timeoutMs;
    }

    // HALF_OPEN allows test request
    return true;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
        this.failureCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in test mode, trip back to OPEN
      this.transitionTo(CircuitState.OPEN);
      this.successCount = 0;
    } else {
      this.failureCount++;

      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.lastStateChange = new Date();
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastStateChange = new Date();
    this.totalRequests = 0;
    this.totalFailures = 0;
  }

  /**
   * Check if circuit is closed (normal operation)
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is half-open (testing recovery)
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}
