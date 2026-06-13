import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = rateLimit({ limit: 10, windowMs: 60_000 });

const SURFACES = ["media_detail", "planner"] as const;
const ANSWERS = ["found", "lost", "complex"] as const;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

/** 이탈 시점 1클릭 설문 응답 저장 (입력 없음, 비차단) */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip)) return json({ ok: false }, { status: 429 });

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const surface = String(raw.surface ?? "");
  const answer = String(raw.answer ?? "");
  if (!SURFACES.includes(surface as never) || !ANSWERS.includes(answer as never)) {
    return json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const sessionId = String(raw.sessionId ?? "").slice(0, 64) || null;
  const path = String(raw.path ?? "").slice(0, 200) || null;

  if (!isDatabaseConfigured()) return json({ ok: true });

  try {
    const user = await getCurrentUser().catch(() => null);
    await getPrisma().exitSurveyResponse.create({
      data: { surface, answer, path, sessionId, userId: user?.id ?? null },
    });
  } catch (e) {
    console.error("[exit-survey]", e instanceof Error ? e.message : e);
    // 비차단 — 실패해도 사용자 흐름에 영향 없음
  }
  return json({ ok: true });
}
