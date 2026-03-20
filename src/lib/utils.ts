/**
 * Shared utility functions.
 * Centralizes helpers that were previously duplicated across multiple files.
 */

/** Returns a Promise that resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Races `promise` against a timeout.
 * Throws with `message` if the timeout fires first.
 * Always clears the timeout to avoid memory leaks.
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
