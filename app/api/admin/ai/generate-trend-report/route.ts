import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { runTrendReportDraftPipeline } from "@/lib/insights/trend-report-pipeline";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * @deprecated Prefer POST /api/admin/reports/generate-ai (Tavily + SSE).
 * Kept for ai-content hub backward compatibility.
 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { month?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const month = String(body.month ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return json({ error: "Invalid month (expected YYYY-MM)" }, 400);
  }

  const db = getPrisma();
  const dup = await db.trendReport.findUnique({ where: { month } });
  if (dup) {
    return json(
      { error: "이미 동일 월(YYYY-MM)의 보고서가 있습니다.", existingId: dup.id },
      409,
    );
  }

  try {
    const result = await runTrendReportDraftPipeline({
      month,
      generationMethod: "manual",
      monthField: month,
    });
    const saved = await db.trendReport.findUnique({
      where: { id: result.trendReport.id },
    });
    return json({ trendReport: saved }, 201);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return json(
        { error: "이미 동일 월(YYYY-MM)의 보고서가 있습니다." },
        409,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/ai/generate-trend-report]", e);
    return json({ error: msg }, 500);
  }
}
