import { NextRequest } from "next/server";
import {
  buildBiMonthlyTrendSlug,
  runBiMonthlyTrendPipeline,
} from "@/lib/content-auto/pipelines";
import {
  notifyContentDraftReady,
  notifyPipelineError,
} from "@/lib/insights/notifiers/slack";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

function seoulParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return { month: `${y}-${m}`, day };
}

/**
 * Vercel Cron — 매월 1·15일 00:00 UTC (09:00 KST) 트렌드 리포트 초안.
 */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ error: "Database not configured" }, 503);
  }

  const { month, day } = seoulParts();
  const slug = buildBiMonthlyTrendSlug(month, day);
  const db = getPrisma();

  const existing = await db.trendReport.findUnique({ where: { slug } });
  if (existing) {
    return json({
      skipped: true,
      reason: "already-generated-this-period",
      slug,
      id: existing.id,
      status: existing.status,
    });
  }

  const startedAt = Date.now();
  try {
    const result = await runBiMonthlyTrendPipeline({ month, slug });

    void notifyContentDraftReady({
      kind: "trend_report",
      id: result.trendReport.id,
      titleKo: result.trendReport.titleKo,
    });

    return json(
      {
        ok: true,
        slug,
        id: result.trendReport.id,
        status: result.trendReport.status,
        month,
        elapsedMs: Date.now() - startedAt,
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
