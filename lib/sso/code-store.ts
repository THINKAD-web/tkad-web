import { randomBytes } from "crypto";
import { Redis } from "@upstash/redis";
import { SSO_CODE_TTL_SEC } from "@/lib/sso/constants";

export type SsoCodePayload = {
  userId: string;
  email: string;
  state: string;
};

type Stored = SsoCodePayload & { exp: number };

const KEY_PREFIX = "tkad:sso:code:";

let _redis: Redis | null = null;
let _redisTried = false;

function getRedis(): Redis | null {
  if (_redisTried) return _redis;
  _redisTried = true;
  if (
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    try {
      _redis = Redis.fromEnv();
    } catch {
      _redis = null;
    }
  }
  return _redis;
}

/** In-memory fallback for local/dev/tests when Upstash is unset. */
const mem = new Map<string, Stored>();

export function resetSsoCodeStoreForTests(): void {
  mem.clear();
  _redis = null;
  _redisTried = false;
}

function memPut(code: string, payload: SsoCodePayload, ttlSec: number): void {
  mem.set(code, { ...payload, exp: Date.now() + ttlSec * 1000 });
}

function memConsume(code: string): SsoCodePayload | null {
  const row = mem.get(code);
  mem.delete(code);
  if (!row) return null;
  if (Date.now() > row.exp) return null;
  return { userId: row.userId, email: row.email, state: row.state };
}

export function createSsoCodeValue(): string {
  return randomBytes(32).toString("base64url");
}

export async function putSsoCode(
  code: string,
  payload: SsoCodePayload,
  ttlSec: number = SSO_CODE_TTL_SEC,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memPut(code, payload, ttlSec);
    return;
  }
  try {
    await redis.set(`${KEY_PREFIX}${code}`, payload, { ex: ttlSec });
  } catch {
    memPut(code, payload, ttlSec);
  }
}

/** Atomically read + delete. Returns null if missing/expired. */
export async function consumeSsoCode(
  code: string,
): Promise<SsoCodePayload | null> {
  if (!code) return null;
  const redis = getRedis();
  if (!redis) return memConsume(code);

  const key = `${KEY_PREFIX}${code}`;
  try {
    const row =
      typeof redis.getdel === "function"
        ? await redis.getdel<SsoCodePayload>(key)
        : await (async () => {
            const v = await redis.get<SsoCodePayload>(key);
            if (v) await redis.del(key);
            return v;
          })();
    if (!row || typeof row !== "object") return null;
    if (
      typeof row.userId !== "string" ||
      typeof row.email !== "string" ||
      typeof row.state !== "string"
    ) {
      return null;
    }
    return { userId: row.userId, email: row.email, state: row.state };
  } catch {
    return memConsume(code);
  }
}
