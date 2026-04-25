import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  generateTrendReport,
  resolveModel,
} from "@/lib/ai-content-generator";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { seoulTargetYmd, seoulWeekdayShort } from "@/lib/seoul-calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Anthropic + DB 작업 여유

/**
 * Vercel Cron 시크릿 검증.
 * Vercel 은 `Authorization: Bearer ${CRON_SECRET}` 헤더로 호출.
 */
function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/**
 * 자동 발행 슬러그.
 * 형식: `auto-YYYY-MM-DD-mon` (예: `auto-2026-04-27-mon`)
 * 같은 날 두 번 트리거되어도 idempotent (slug unique).
 */
function buildAutoSlug(ymd: string, weekday: string): string {
  return `auto-${ymd}-${weekday.toLowerCase()}`;
}

/**
 * Vercel Cron — 매주 월/목 09:00 KST (= 00:00 UTC) 자동 트렌드 리포트 생성.
 * vercel.json 의 crons 항목과 짝.
 *
 * 동작:
 *  1) Auth (CRON_SECRET) 검증
 *  2) 오늘 자 slug 생성 (`auto-2026-04-27-mon`)
 *  3) 같은 slug 가 이미 있으면 skip (idempotent — 같은 날 재트리거 안전)
 *  4) `generateTrendReport(month)` 호출 (month=YYYY-MM)
 *  5) `status: "draft"`, `generationMethod: "auto"`, slug 채워서 DB 저장
 *  6) PR-3 검증 레이어가 통과시키면 status → "published" 로 전환 예정
 *
 * 수동 테스트: `curl -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/generate-trend-report`
 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  const ymd = seoulTargetYmd(0);
  const weekday = seoulWeekdayShort();
  const slug = buildAutoSlug(ymd, weekday);
  const month = ymd.slice(0, 7);

  const db = getPrisma();

  const existing = await db.trendReport.findUnique({ where: { slug } });
  if (existing) {
    return json({
      skipped: true,
      reason: "already-generated-today",
      slug,
      id: existing.id,
      status: existing.status,
    });
  }

  const startedAt = Date.now();
  try {
    const g = await generateTrendReport(month);

    const saved = await db.trendReport.create({
      data: {
        slug,
        // 자동 발행 row 는 month 의 unique 충돌을 피하기 위해 null.
        // 어드민이 수동 생성하는 월간 리포트만 month 사용.
        month: null,
        status: "draft",
        titleKo: g.titleKo,
        titleEn: g.titleEn,
        contentKo: g.contentKo,
        summaryKo: g.summaryKo,
        marketTrendKo: g.marketTrendKo,
        doohTrendKo: g.doohTrendKo,
        verticalStrategies:
          g.verticalStrategies === null || g.verticalStrategies === undefined
            ? undefined
            : (g.verticalStrategies as Prisma.InputJsonValue),
        thumbnailUrl: g.thumbnailUrl,
        publishedAt: null,
        generationMethod: "auto",
        aiModel: resolveModel(),
      },
    });

    const elapsedMs = Date.now() - startedAt;
    return json(
      {
        ok: true,
        slug,
        id: saved.id,
        status: saved.status,
        elapsedMs,
        aiModel: saved.aiModel,
      },
      201,
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return json({ error: "duplicate-slug", slug }, 409);
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[cron/generate-trend-report]", msg);
    return json({ error: msg, slug }, 500);
  }
}
