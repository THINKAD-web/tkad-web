import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { validateTrendReport } from "@/lib/insights/validators/auto-validator";
import type { WebSource } from "@/lib/insights/types";
import { notifyValidationOutcome } from "@/lib/insights/notifiers/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 어드민 수동 재검증.
 * 기존 draft / published 글에 검증을 다시 돌려 점수·이슈를 갱신.
 *
 * - body: `{ id: string }`
 * - 결과: 검증 후 trend_report 의 validationScore/validationResult 갱신
 *   status 는 변경하지 않음 (운영자가 어드민 UI 에서 별도 결정)
 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const id = String(body.id ?? "").trim();
  if (!id) return json({ error: "id required" }, 400);

  const db = getPrisma();
  const draft = await db.trendReport.findUnique({ where: { id } });
  if (!draft) return json({ error: "TrendReport not found" }, 404);

  const sources = Array.isArray(draft.sources)
    ? (draft.sources as unknown as WebSource[])
    : [];

  try {
    const result = await validateTrendReport(draft, sources);
    const updated = await db.trendReport.update({
      where: { id },
      data: {
        validationScore: result.totalScore,
        validationResult: result as unknown as Prisma.InputJsonValue,
      },
    });
    // 어드민이 수동 트리거한 재검증도 Slack 라우팅 (운영팀이 결과 공유 가능).
    void notifyValidationOutcome(updated, result);
    return json(
      {
        ok: true,
        id: updated.id,
        validationScore: updated.validationScore,
        verdict: result.verdict,
        issuesCount: result.issues.length,
        criticalCount: result.issues.filter((i) => i.severity === "critical")
          .length,
      },
      200,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return json({ error: "AI 미설정: ANTHROPIC_API_KEY" }, 503);
    }
    console.error("[admin/ai/validate-trend-report]", msg);
    return json({ error: msg }, 500);
  }
}
