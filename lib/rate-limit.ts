type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

/**
 * Simple in-memory sliding-window rate limiter.
 * Sufficient for single-instance deployments; for multi-instance /
 * serverless at scale, swap with Redis-backed solution (e.g. Upstash).
 */
export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  setInterval(() => {
    const cutoff = Date.now() - windowMs * 2;
    for (const [key, timestamps] of hits) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) hits.delete(key);
      else hits.set(key, filtered);
    }
  }, windowMs).unref();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const windowStart = now - windowMs;
      const timestamps = hits.get(key)?.filter((t) => t > windowStart) ?? [];

      if (timestamps.length >= limit) return false;

      timestamps.push(now);
      hits.set(key, timestamps);
      return true;
    },
  };
}
