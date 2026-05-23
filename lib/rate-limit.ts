import {
  checkUpstashRateLimit,
  type RateLimitPreset,
} from "@/lib/rate-limit-upstash";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type MemoryLimiter = {
  check(key: string): boolean;
};

const memoryLimiters = new Map<string, MemoryLimiter>();

function memoryKey(limit: number, windowMs: number): string {
  return `${limit}:${windowMs}`;
}

/**
 * In-memory sliding-window limiter (single-instance fallback).
 */
export function rateLimit({ limit, windowMs }: RateLimitOptions): MemoryLimiter {
  const key = memoryKey(limit, windowMs);
  const existing = memoryLimiters.get(key);
  if (existing) return existing;

  const hits = new Map<string, number[]>();

  setInterval(() => {
    const cutoff = Date.now() - windowMs * 2;
    for (const [k, timestamps] of hits) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) hits.delete(k);
      else hits.set(k, filtered);
    }
  }, windowMs).unref();

  const limiter: MemoryLimiter = {
    check(ipKey: string): boolean {
      const now = Date.now();
      const windowStart = now - windowMs;
      const timestamps = hits.get(ipKey)?.filter((t) => t > windowStart) ?? [];
      if (timestamps.length >= limit) return false;
      timestamps.push(now);
      hits.set(ipKey, timestamps);
      return true;
    },
  };

  memoryLimiters.set(key, limiter);
  return limiter;
}

const PRESET_MEMORY: Record<
  RateLimitPreset,
  { limit: number; windowMs: number }
> = {
  contact: { limit: 3, windowMs: 5 * 60_000 },
  mediaRegister: { limit: 3, windowMs: 10 * 60_000 },
  recommend: { limit: 5, windowMs: 60_000 },
  authRegister: { limit: 3, windowMs: 5 * 60_000 },
};

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

/**
 * Upstash (Vercel) when env configured; otherwise in-memory fallback.
 */
export async function enforceRateLimit(
  preset: RateLimitPreset,
  key: string,
): Promise<{ ok: true } | { ok: false; status: 429; message: string }> {
  if (upstashConfigured()) {
    const upstash = await checkUpstashRateLimit(preset, key);
    if (!upstash.ok) {
      return {
        ok: false,
        status: 429,
        message: "잠시 후 다시 시도해주세요.",
      };
    }
    return { ok: true };
  }

  const memCfg = PRESET_MEMORY[preset];
  const mem = rateLimit(memCfg);
  if (!mem.check(key)) {
    return {
      ok: false,
      status: 429,
      message: "잠시 후 다시 시도해주세요.",
    };
  }

  return { ok: true };
}
