/**
 * In-process token-bucket rate limiter for API endpoints.
 *
 * SECURITY: Rate limiting prevents a single client from:
 * - Burning through Gemini API quota (each investigation = multiple AI calls)
 * - Abusing LiveKit SIP trunk credits (each call costs money)
 * - Brute-forcing or flooding the investigation creation endpoint
 *
 * Implementation: token bucket per IP with a sliding window.
 * Bucket entries are pruned on each check to prevent unbounded memory growth.
 *
 * CLOUD RUN NOTE: This is in-process state. Each Cloud Run instance has its own
 * limiter. For multi-instance deployments, replace `buckets` Map with an
 * Upstash Redis counter:
 *   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Current limits (see investigationLimiter export):
 *   - 30 investigation creations per IP per minute
 */

type RateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type BucketEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimiter({ windowMs, maxRequests }: RateLimiterOptions) {
  const buckets = new Map<string, BucketEntry>();

  function prune() {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) {
        buckets.delete(key);
      }
    }
  }

  function check(identifier: string): RateLimitResult {
    prune();

    const now = Date.now();
    const existing = buckets.get(identifier);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowMs;
      buckets.set(identifier, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      resetAt: existing.resetAt,
    };
  }

  return { check };
}

/** Per-IP limiter: 30 POST requests per minute. */
export const investigationLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});
