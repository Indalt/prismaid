/**
 * Rate limiter using token bucket per domain.
 * Ensures polite crawling of institutional repositories.
 */
export class RateLimiter {
    buckets = new Map();
    defaultRate;
    constructor(defaultRatePerSecond = 1) {
        this.defaultRate = defaultRatePerSecond;
    }
    /**
     * Extract domain from URL for per-domain rate limiting.
     */
    getDomain(url) {
        try {
            return new URL(url).hostname;
        }
        catch {
            return url;
        }
    }
    /**
     * Set custom rate for a specific domain.
     */
    setRate(domain, ratePerSecond) {
        const bucket = this.buckets.get(domain);
        if (bucket) {
            bucket.ratePerSecond = ratePerSecond;
        }
        else {
            this.buckets.set(domain, {
                tokens: ratePerSecond,
                lastRefill: Date.now(),
                ratePerSecond,
            });
        }
    }
    /**
     * Wait until a request to this URL is allowed.
     */
    async acquire(url) {
        const domain = this.getDomain(url);
        if (!this.buckets.has(domain)) {
            this.buckets.set(domain, {
                tokens: this.defaultRate,
                lastRefill: Date.now(),
                ratePerSecond: this.defaultRate,
            });
        }
        const bucket = this.buckets.get(domain);
        // Refill tokens based on elapsed time
        const now = Date.now();
        const elapsed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(bucket.ratePerSecond, bucket.tokens + elapsed * bucket.ratePerSecond);
        bucket.lastRefill = now;
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return;
        }
        // Wait for token to become available
        const waitMs = ((1 - bucket.tokens) / bucket.ratePerSecond) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        bucket.tokens = 0;
        bucket.lastRefill = Date.now();
    }
}
// Singleton instance
export const rateLimiter = new RateLimiter(1);
//# sourceMappingURL=rate-limiter.js.map