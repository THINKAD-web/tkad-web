import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitPreset =
  | "contact"
  | "mediaRegister"
  | "recommend"
  | "authRegister";

const PRESETS: Record<
  RateLimitPreset,
  { requests: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
> = {
  contact: { requests: 3, window: "5 m" },
  mediaRegister: { requests: 3, window: "10 m" },
  recommend: { requests: 5, window: "1 m" },
  authRegister: { requests: 3, window: "5 m" },
};

const limiters = new Map<RateLimitPreset, Ratelimit>();

function getUpstashLimiter(preset: RateLimitPreset): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const cached = limiters.get(preset);
  if (cached) return cached;

  const cfg = PRESETS[preset];
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
    prefix: `tkad:rl:${preset}`,
    analytics: true,
  });
  limiters.set(preset, limiter);
  return limiter;
}

export async function checkUpstashRateLimit(
  preset: RateLimitPreset,
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec?: number }> {
  const limiter = getUpstashLimiter(preset);
  if (!limiter) return { ok: true };

  const result = await limiter.limit(key);
  if (result.success) return { ok: true };
  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return { ok: false, retryAfterSec };
}
