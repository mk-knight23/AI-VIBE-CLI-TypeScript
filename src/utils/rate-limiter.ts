/**
 * Rate Limiter Implementation
 * Token bucket algorithm for request rate limiting
 */

export interface RateLimiterConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests per window
    burstLimit?: number;   // Maximum burst size
}

export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private requests: number[] = [];

    constructor(private config: RateLimiterConfig) {
        this.tokens = config.maxRequests;
        this.lastRefill = Date.now();
    }

    isRateLimited(): boolean {
        this.refillTokens();
        return this.tokens < 1;
    }

    recordRequest(): boolean {
        this.refillTokens();

        if (this.tokens >= 1) {
            this.tokens--;
            this.requests.push(Date.now());
            return true;
        }

        return false;
    }

    getRemainingTokens(): number {
        this.refillTokens();
        return Math.floor(this.tokens);
    }

    getResetTime(): number {
        const oldestRequest = this.requests[0];
        if (!oldestRequest) return Date.now();

        return oldestRequest + this.config.windowMs;
    }

    getMetrics(): {
        remaining: number;
        limit: number;
        resetTime: number;
        isLimited: boolean;
    } {
        return {
            remaining: this.getRemainingTokens(),
            limit: this.config.maxRequests,
            resetTime: this.getResetTime(),
            isLimited: this.isRateLimited()
        };
    }

    reset(): void {
        this.tokens = this.config.maxRequests;
        this.lastRefill = Date.now();
        this.requests = [];
    }

    private refillTokens(): void {
        const now = Date.now();
        const timePassed = now - this.lastRefill;

        if (timePassed < this.config.windowMs) {
            const tokensToAdd = (timePassed / this.config.windowMs) * this.config.maxRequests;
            this.tokens = Math.min(this.tokens + tokensToAdd, this.config.maxRequests);
        } else {
            this.tokens = this.config.maxRequests;
        }

        this.lastRefill = now;

        // Remove old requests outside the window
        const windowStart = now - this.config.windowMs;
        this.requests = this.requests.filter(time => time > windowStart);
    }
}

