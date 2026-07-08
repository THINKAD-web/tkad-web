import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isPro } from "@/lib/plan-check-shared";
import {
  AI_CHATBOT_HOURLY_ABUSE_LIMIT,
  AI_DAILY_LIMITS,
  AI_HOURLY_ABUSE_LIMIT,
} from "@/lib/entitlements/constants";
import { aiRateMessage as aiRateMessageFromEntitlements } from "@/lib/entitlements/gate-messages";

/** 일일 AI 사용 한도 */
const DAILY = AI_DAILY_LIMITS;
/** 시간당 동일 IP 어뷰징 한도 */
const HOURLY_ABUSE = AI_HOURLY_ABUSE_LIMIT;
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

/** 규칙 챗봇(0토큰) — 일일 한도 없음, 시간당 IP abuse·봇 UA만 검사. */
export async function checkChatbotRuleAbuseLimit(opts: {
  ipOnlyHash: string;
  ua: string;
}): Promise<AiRateResult> {
  if (!opts.ua || BOT_RE.test(opts.ua)) {
    return { allowed: false, remaining: 0, limit: 0, reason: "abuse" };
  }

  const hour = new Date().toISOString().slice(0, 13);
  const hourCount = await incr(
    `tkad:ai:chatbot:hourly:${opts.ipOnlyHash}:${hour}`,
    3600,
  );
  if (hourCount > AI_CHATBOT_HOURLY_ABUSE_LIMIT) {
    return { allowed: false, remaining: 0, limit: 0, reason: "abuse" };
  }

  return { allowed: true, remaining: 0, limit: 0 };
}

/** 규칙 챗봇 라우트용 — enforceAiRateLimit 과 분리 (Claude 유료 경로는 기존 일일 한도). */
export async function enforceChatbotRuleAbuseLimit(
  req: Request,
): Promise<AiRateResult> {
  const id = aiRateIdentity(req, null);
  return checkChatbotRuleAbuseLimit({
    ipOnlyHash: id.ipOnlyHash,
    ua: id.ua,
  });
}

export function aiRateMessage(reason: AiRateReason | undefined, isKo: boolean): string {
  return aiRateMessageFromEntitlements(reason, isKo);
}

/** 규칙 챗봇 abuse 차단 시 UI·API 한 줄 메시지 */
export function chatbotAbuseMessage(isKo: boolean): string {
  return isKo
    ? "잠시 후 다시 시도해 주세요. 짧은 시간에 요청이 많으면 잠깐 쉬어갈 수 있어요."
    : "Please try again in a moment. Too many requests in a short time — take a short break.";
}
