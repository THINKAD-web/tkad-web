import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import {
  enforceAiRateLimit,
  resolveIsPro,
  aiRateMessage,
} from "@/lib/ai-rate-limit";
import { parseFreetextToBrief } from "@/lib/recommend-freetext-parse";

/**
 * @deprecated 클라이언트 미사용 — /recommend·홈·플래너 자유입력은
 * `parsePlannerFreetextBrief`(규칙·0토큰)로 통일됨. Haiku 파서는 데드코드.
 * 제거는 별도 작업. (PRO 게이트·일일 쿼터는 이 라우트에만 남아 있음)
 */
export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

const MIN_CHARS = 5;
const MAX_CHARS = 2000;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  const userId = user?.id ?? null;

  // 1) PRO 하드 게이트 — 비PRO 는 Haiku 호출 전에 차단
  const pro = await resolveIsPro(userId);
  if (!pro) {
    return json(
      {
        ok: false,
        error: "pro_required",
        message: userId
          ? "AI 자유입력 추천은 PRO 전용 기능입니다."
          : "AI 자유입력 추천은 PRO 전용 기능입니다. 로그인 후 PRO로 업그레이드하세요.",
      },
      { status: 403 },
    );
  }

  // 2) PRO 일일 쿼터(30) + 시간당 어뷰징
  const rl = await enforceAiRateLimit(request, userId);
  if (!rl.allowed) {
    return json(
      {
        ok: false,
        rateLimited: true,
        reason: rl.reason,
        message: aiRateMessage(rl.reason, true),
        limit: rl.limit,
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
  const obj = (body ?? {}) as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text.trim() : "";
  const locale = typeof obj.locale === "string" ? obj.locale : "ko";
  const isKo = locale.startsWith("ko");

  if (text.length < MIN_CHARS) {
    return json(
      {
        ok: false,
        error: "too_short",
        message: isKo
          ? "캠페인 조건을 조금 더 자세히 입력해주세요."
          : "Please describe your campaign in a bit more detail.",
      },
      { status: 400 },
    );
  }
  if (text.length > MAX_CHARS) {
    return json(
      {
        ok: false,
        error: "too_long",
        message: isKo
          ? "입력이 너무 깁니다. 2000자 이내로 줄여주세요."
          : "Input is too long. Please keep it under 2000 characters.",
      },
      { status: 400 },
    );
  }

  try {
    const fields = await parseFreetextToBrief(text, isKo);
    return json({ ok: true, fields, remaining: rl.remaining });
  } catch (e) {
    console.error("[api/recommend/parse]", e);
    return json(
      {
        ok: false,
        error: "parse_failed",
        message: isKo
          ? "조건 분석에 실패했습니다. 잠시 후 다시 시도해주세요."
          : "Could not analyze the brief. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
