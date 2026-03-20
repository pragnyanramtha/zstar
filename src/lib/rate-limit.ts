/**
 * In-process token-bucket rate limiter.
 * Works in Cloud Run / serverless as long as requests are handled within the
 * same process instance. For multi-instance deployments, replace with a
 * Redis-backed counter (e.g. Upstash).
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return new Response("Too many requests", { status: 429 });
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
