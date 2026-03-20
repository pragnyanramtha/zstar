import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests within the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check("user-1");
    limiter.check("user-1");
    const result = limiter.check("user-1");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter.check("user-1");
    expect(limiter.check("user-1").allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(limiter.check("user-1").allowed).toBe(true);
  });

  it("tracks users independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.check("user-a");
    expect(limiter.check("user-a").allowed).toBe(false);
    expect(limiter.check("user-b").allowed).toBe(true);
  });

  it("returns correct remaining count", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

    const first = limiter.check("user-1");
    expect(first.remaining).toBe(4);

    const second = limiter.check("user-1");
    expect(second.remaining).toBe(3);
  });

  it("returns a resetAt timestamp in the future", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const result = limiter.check("user-1");
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
