/**
 * Shared utility functions.
 * Centralizes helpers that were previously duplicated across multiple files.
 *
 * EFFICIENCY: A single import replaces ~4 copy-paste implementations.
 */

/** Returns a Promise that resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Races `promise` against a timeout.
 * Throws with `message` if the timeout fires first.
 *
 * SECURITY / EFFICIENCY: Always clears the timeout in a `finally` block.
 * Without this, the timer would hold a reference to `reject` keeping the
 * promise allocated in memory until the timer fires — even if the race is
 * already resolved. This is a common Node.js memory leak pattern.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let handle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    handle = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (handle) clearTimeout(handle);
  }
}
