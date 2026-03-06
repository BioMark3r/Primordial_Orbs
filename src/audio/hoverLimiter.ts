export function createRateLimiter(intervalMs: number) {
  let lastAt = -Infinity;
  return (now = Date.now()): boolean => {
    if (now - lastAt < intervalMs) return false;
    lastAt = now;
    return true;
  };
}
