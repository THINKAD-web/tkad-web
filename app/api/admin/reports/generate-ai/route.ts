import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import {
  runTrendReportDraftPipeline,
  type TrendReportPipelineEvent,
} from "@/lib/insights/trend-report-pipeline";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function parseMonth(raw: unknown): string | null {
  const month = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return month;
}

function sseResponse(
  handler: (
    send: (event: TrendReportPipelineEvent) => void,
  ) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TrendReportPipelineEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      try {
        await handler(send);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ phase: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: {
    month?: string;
    stream?: boolean;
    reportId?: string;
    regenerate?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const month = parseMonth(body.month);
  if (!month) {
    return json({ error: "Invalid month (expected YYYY-MM)" }, 400);
  }

  const reportId =
    typeof body.reportId === "string" && body.reportId.trim()
      ? body.reportId.trim()
      : undefined;
  const regenerate = body.regenerate === true;
  const useStream = body.stream !== false;

  const db = getPrisma();

  if (!reportId && !regenerate) {
    const dup = await db.trendReport.findUnique({ where: { month } });
    if (dup) {
      return json(
        {
          error: "이미 동일 월(YYYY-MM)의 보고서가 있습니다.",
          existingId: dup.id,
        },
        409,
      );
    }
  }

  if (reportId) {
    const existing = await db.trendReport.findUnique({ where: { id: reportId } });
    if (!existing) {
      return json({ error: "Report not found" }, 404);
    }
  }

  const run = async (onProgress?: (e: TrendReportPipelineEvent) => void) => {
    return runTrendReportDraftPipeline({
      month,
      reportId,
      generationMethod: "manual",
      monthField: month,
      onProgress,
    });
  };

  if (!useStream) {
    try {
      const result = await run();
      return json({ trendReport: result.trendReport }, 201);
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
      console.error("[admin/reports/generate-ai]", e);
      return json({ error: msg }, 500);
    }
  }

  return sseResponse(async (send) => {
    try {
      const result = await run(send);
      send(result);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        send({
          phase: "error",
          error: "이미 동일 월(YYYY-MM)의 보고서가 있습니다.",
        });
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ANTHROPIC_API_KEY")) {
        send({ phase: "error", error: "AI 미설정: ANTHROPIC_API_KEY" });
        return;
      }
      console.error("[admin/reports/generate-ai stream]", e);
      send({ phase: "error", error: msg });
    }
  });
}
