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

/**
 * Sliding Window Rate Limiter
 * More accurate rate limiting using sliding window algorithm
 */

export class SlidingWindowRateLimiter {
    private windowStart: number = Date.now();
    private requestCount: number = 0;
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(config: RateLimiterConfig) {
        this.windowMs = config.windowMs;
        this.maxRequests = config.maxRequests;
    }

    isRateLimited(): boolean {
        this.cleanupWindow();
        return this.requestCount >= this.maxRequests;
    }

    recordRequest(): boolean {
        this.cleanupWindow();

        if (this.requestCount < this.maxRequests) {
            this.requestCount++;
            return true;
        }

        return false;
    }

    getRemainingRequests(): number {
        this.cleanupWindow();
        return Math.max(0, this.maxRequests - this.requestCount);
    }

    getMetrics(): {
        remaining: number;
        limit: number;
        windowMs: number;
        isLimited: boolean;
    } {
        return {
            remaining: this.getRemainingRequests(),
            limit: this.maxRequests,
            windowMs: this.windowMs,
            isLimited: this.isRateLimited()
        };
    }

    reset(): void {
        this.windowStart = Date.now();
        this.requestCount = 0;
    }

    private cleanupWindow(): void {
        const now = Date.now();
        if (now - this.windowStart >= this.windowMs) {
            this.windowStart = now;
            this.requestCount = 0;
        }
    }
}
