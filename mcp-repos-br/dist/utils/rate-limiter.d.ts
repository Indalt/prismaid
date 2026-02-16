/**
 * Rate limiter using token bucket per domain.
 * Ensures polite crawling of institutional repositories.
 */
export declare class RateLimiter {
    private buckets;
    private defaultRate;
    constructor(defaultRatePerSecond?: number);
    /**
     * Extract domain from URL for per-domain rate limiting.
     */
    private getDomain;
    /**
     * Set custom rate for a specific domain.
     */
    setRate(domain: string, ratePerSecond: number): void;
    /**
     * Wait until a request to this URL is allowed.
     */
    acquire(url: string): Promise<void>;
}
export declare const rateLimiter: RateLimiter;
//# sourceMappingURL=rate-limiter.d.ts.map