import { NextRequest, NextResponse } from "next/server";
import { runRecommendation } from "@/lib/recommendation-service";
import {
  aiInputToMatching,
  matchedToApiItems,
} from "@/lib/recommendation-adapters";
import { getCurrentUser } from "@/lib/user-session";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import { enforceRateLimit } from "@/lib/rate-limit";
import { enforceAiRateLimit, aiRateMessage } from "@/lib/ai-rate-limit";
import { verifyTurnstileForRequest } from "@/lib/turnstile-verify";
import { recommendRequestSchema } from "@/lib/schemas/recommend";
import { postInternalAlert } from "@/lib/internal-webhook";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await enforceRateLimit("recommend", ip);
  if (!rl.ok) {
    return json({ ok: false, error: "rate_limited", message: rl.message }, { status: 429 });
  }

  // 일일 AI 한도 (비로그인 1 / 로그인 5 / PRO 30) + 어뷰징 방지
  const aiUser = await getCurrentUser();
  const aiRl = await enforceAiRateLimit(request, aiUser?.id ?? null);
  if (!aiRl.allowed) {
    return json(
      {
        ok: false,
        rateLimited: true,
        reason: aiRl.reason,
        message: aiRateMessage(aiRl.reason, true),
        remaining: 0,
        limit: aiRl.limit,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const turnstileToken =
    typeof body === "object" && body && !Array.isArray(body)
      ? ((body as Record<string, unknown>).turnstileToken as string | undefined) ??
        ((body as Record<string, unknown>).captchaToken as string | undefined)
      : undefined;

  const turnstile = await verifyTurnstileForRequest({
    token: turnstileToken,
    remoteip: ip,
    host: request.headers.get("host"),
  });
  if (!turnstile.ok) {
    console.warn("[api/recommend] turnstile_failed", turnstile.reason, { ip });
    void postInternalAlert({
      type: "security_turnstile",
      title: "Recommend Turnstile 실패",
      body: `reason=${turnstile.reason} ip=${ip}`,
    }).catch(() => {});
    return json({ ok: false, error: "turnstile_failed", message: "보안 확인이 필요합니다." }, { status: 401 });
  }

  const parsed = recommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        error: "invalid_payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { input, seed = 0, limit = 10, sessionId, locale, useClaude, excludeNetwork } =
    parsed.data;
  const isKo = (locale ?? "ko").startsWith("ko");
  const matchingInput = aiInputToMatching(input as AiRecommendInput, seed);

  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    /* public */
  }

  try {
    const { recommendations, cached, logId } = await runRecommendation({
      input: matchingInput,
      source: "recommend",
      limit,
      useClaude,
      excludeNetwork,
      isKo,
      userId,
      sessionId: sessionId ?? null,
    });

    const items = matchedToApiItems(
      recommendations,
      input.industry,
      [input.target],
      isKo,
    );

    return json({
      ok: true,
      cached,
      logId,
      items,
      recommendations: items,
    });
  } catch (e) {
    console.error("[api/recommend]", e);
    return json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
