import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { runTrendReportDraftPipeline } from "@/lib/insights/trend-report-pipeline";
import {
  notifyPipelineError,
  notifyTrendDraftReady,
} from "@/lib/insights/notifiers/slack";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

/** 월간 idempotent 슬러그: `monthly-2026-05` */
function buildMonthlySlug(month: string): string {
  return `monthly-${month}`;
}

function currentMonthSeoul(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

/**
 * Vercel Cron — 매월 1일 00:00 UTC (09:00 KST) 트렌드 리포트 초안 생성.
 * - Tavily + Claude → status=draft (운영 검토 후 수동 발행)
 * - Slack: "이번 달 트렌드 리포트 초안이 생성됐어요. 검토 후 발행해주세요"
 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  const month = currentMonthSeoul();
  const slug = buildMonthlySlug(month);
  const db = getPrisma();

  const existing = await db.trendReport.findUnique({ where: { slug } });
  if (existing) {
    return json({
      skipped: true,
      reason: "already-generated-this-month",
      slug,
      id: existing.id,
      status: existing.status,
    });
  }

  const startedAt = Date.now();
  try {
    const result = await runTrendReportDraftPipeline({
      month,
      slug,
      generationMethod: "auto",
      monthField: month,
    });

    const saved = await db.trendReport.findUnique({
      where: { id: result.trendReport.id },
    });
    if (saved) {
      void notifyTrendDraftReady(saved, {
        sourcesCount: Array.isArray(saved.sources)
          ? (saved.sources as unknown[]).length
          : undefined,
      });
    }

    const elapsedMs = Date.now() - startedAt;
    return json(
      {
        ok: true,
        slug,
        id: result.trendReport.id,
        status: result.trendReport.status,
        month,
        elapsedMs,
        message: "draft created — awaiting admin review",
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
    void notifyPipelineError("generate-or-save", msg, { slug, month });
    return json({ error: msg, slug }, 500);
  }
}
