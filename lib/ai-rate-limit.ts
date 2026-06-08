import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isPro } from "@/lib/plan-check-shared";

/** 일일 AI 사용 한도 */
const DAILY = { guest: 1, user: 5, pro: 30 } as const;
/** 시간당 동일 IP 어뷰징 한도 */
const HOURLY_ABUSE = 20;
const BOT_RE =
  /(bot|crawl|spider|slurp|curl|wget|python-requests|httpclient|scrapy|headless|phantomjs|node-fetch)/i;

export type AiRateReason = "guest_limit" | "user_limit" | "abuse";
export type AiRateResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: AiRateReason;
};

let _redis: Redis | null = null;
let _redisTried = false;
function getRedis(): Redis | null {
  if (_redisTried) return _redis;
  _redisTried = true;
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      _redis = Redis.fromEnv();
    } catch {
      _redis = null;
    }
  }
  return _redis;
}

// Redis 미구성 시 인스턴스 메모리 폴백(베스트에포트)
const mem = new Map<string, { n: number; exp: number }>();
function memIncr(key: string, ttlSec: number): number {
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.exp < now) {
    mem.set(key, { n: 1, exp: now + ttlSec * 1000 });
    return 1;
  }
  cur.n += 1;
  return cur.n;
}
async function incr(key: string, ttlSec: number): Promise<number> {
  const r = getRedis();
  if (!r) return memIncr(key, ttlSec);
  try {
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, ttlSec);
    return n;
  } catch {
    return memIncr(key, ttlSec);
  }
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 24);
}

export function aiRateIdentity(
  req: Request,
  userId: string | null,
): {
  identifier: string;
  ipOnlyHash: string;
  ua: string;
  isLoggedIn: boolean;
} {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  return {
    identifier: userId ? `u:${userId}` : `g:${sha(`${ip}|${ua}`)}`,
    ipOnlyHash: sha(ip),
    ua,
    isLoggedIn: Boolean(userId),
  };
}

/** 로그인 사용자의 PRO 여부 (plan/trial 조회). 실패 시 false. */
export async function resolveIsPro(userId: string | null): Promise<boolean> {
  if (!userId || !isDatabaseConfigured()) return false;
  try {
    const u = await getPrisma().user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        trialStartedAt: true,
        trialEndsAt: true,
        proTrialEndsAt: true,
      },
    });
    return u ? isPro(u) : false;
  } catch {
    return false;
  }
}

export async function checkAiRateLimit(opts: {
  identifier: string;
  ipOnlyHash: string;
  ua: string;
  isLoggedIn: boolean;
  isPro: boolean;
}): Promise<AiRateResult> {
  const limit = opts.isPro ? DAILY.pro : opts.isLoggedIn ? DAILY.user : DAILY.guest;

  // 봇/UA 없음 → 조용히 차단
  if (!opts.ua || BOT_RE.test(opts.ua)) {
    return { allowed: false, remaining: 0, limit, reason: "abuse" };
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);

  // 시간당 어뷰징 (IP 기준)
  const hourCount = await incr(`tkad:ai:hourly:${opts.ipOnlyHash}:${hour}`, 3600);
  if (hourCount > HOURLY_ABUSE) {
    return { allowed: false, remaining: 0, limit, reason: "abuse" };
  }

  // 일일 quota
  const count = await incr(`tkad:ai:usage:${opts.identifier}:${day}`, 86400);
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    limit,
    reason: allowed ? undefined : opts.isLoggedIn ? "user_limit" : "guest_limit",
  };
}

/** 라우트 1줄 적용용 — 식별 + PRO 조회 + 체크. */
export async function enforceAiRateLimit(
  req: Request,
  userId: string | null,
): Promise<AiRateResult> {
  const id = aiRateIdentity(req, userId);
  const pro = await resolveIsPro(userId);
  return checkAiRateLimit({
    identifier: id.identifier,
    ipOnlyHash: id.ipOnlyHash,
    ua: id.ua,
    isLoggedIn: id.isLoggedIn,
    isPro: pro,
  });
}

export function aiRateMessage(reason: AiRateReason | undefined, isKo: boolean): string {
  if (reason === "guest_limit") {
    return isKo
      ? "오늘 무료 AI 이용을 모두 사용했어요. 로그인하면 매일 5회까지 이용 가능합니다."
      : "You've used today's free AI quota. Sign in for up to 5 uses per day.";
  }
  if (reason === "user_limit") {
    return isKo
      ? "오늘 AI 분석을 모두 사용했어요. 더 많은 분석이 필요하면 전문가 상담을 받아보세요."
      : "You've used today's AI quota. Need more? Talk to our experts.";
  }
  return isKo
    ? "잠시 후 다시 시도해주세요."
    : "Please try again in a moment.";
}
