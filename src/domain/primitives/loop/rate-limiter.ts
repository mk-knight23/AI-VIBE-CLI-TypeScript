/**
 * Rate Limiter
 *
 * Enforces API call rate limits (default: 100 calls/hour).
 * Prevents hitting API quotas and manages usage across sessions.
 */

export interface RateLimiterConfig {
  maxCallsPerHour: number;
  windowMs: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  callsRemaining: number;
  windowResetTime: Date;
  callsThisHour: number;
}

const DEFAULT_RATE_LIMIT: RateLimiterConfig = {
  maxCallsPerHour: 100,
  windowMs: 3600000, // 1 hour
};

export class RateLimiter {
  private config: RateLimiterConfig;
  private calls: number[] = []; // Timestamps of calls
  private windowStart: Date;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config };
    this.windowStart = new Date();
  }

  /**
   * Check if an API call is allowed
   */
  canMakeCall(): RateLimitStatus {
    const now = new Date();

    // Reset window if expired
    if (now.getTime() - this.windowStart.getTime() >= this.config.windowMs) {
      this.calls = [];
      this.windowStart = now;
    }

    // Remove calls outside current window
    const windowStart = this.windowStart.getTime();
    this.calls = this.calls.filter(timestamp => timestamp >= windowStart);

    const callsRemaining = this.config.maxCallsPerHour - this.calls.length;
    const allowed = callsRemaining > 0;

    return {
      allowed,
      callsRemaining,
      windowResetTime: new Date(this.windowStart.getTime() + this.config.windowMs),
      callsThisHour: this.calls.length,
    };
  }

  /**
   * Record an API call
   */
  recordCall(): void {
    this.calls.push(Date.now());
  }

  /**
   * Wait until rate limit allows next call
   */
  async waitForAvailability(): Promise<void> {
    const status = this.canMakeCall();

    if (!status.allowed) {
      const waitTime = status.windowResetTime.getTime() - Date.now();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): RateLimitStatus {
    return this.canMakeCall();
  }

  /**
   * Get configuration
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.calls = [];
    this.windowStart = new Date();
  }

  /**
   * Get statistics
   */
  getStats() {
    const status = this.getStatus();
    return {
      ...status,
      utilizationPercentage: (status.callsThisHour / this.config.maxCallsPerHour) * 100,
      windowStartTime: this.windowStart,
    };
  }
}
