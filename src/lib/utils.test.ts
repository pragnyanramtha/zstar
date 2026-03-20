import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sleep, withTimeout } from "./utils";

describe("sleep", () => {
  it("resolves after the specified delay", async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it("returns void", async () => {
    const result = await sleep(0);
    expect(result).toBeUndefined();
  });
});

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when the promise resolves before timeout", async () => {
    const fastPromise = Promise.resolve("done");
    const result = await withTimeout(fastPromise, 1000, "timed out");
    expect(result).toBe("done");
  });

  it("rejects with the custom message when timeout fires first", async () => {
    const neverResolves = new Promise<string>(() => {});
    const race = withTimeout(neverResolves, 500, "custom timeout message");

    vi.advanceTimersByTime(600);

    await expect(race).rejects.toThrow("custom timeout message");
  });

  it("clears the timer when the promise resolves early (no memory leak)", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const fastPromise = Promise.resolve("early");
    await withTimeout(fastPromise, 5000, "should not fire");
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
