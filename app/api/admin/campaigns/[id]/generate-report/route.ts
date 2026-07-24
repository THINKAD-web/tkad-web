import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { issueCampaignCompletionReport } from "@/lib/campaign-completion-report-issue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * Admin: 완료 리포트 생성·발송.
 * PDF 생성 + Resend(가능 시) + reportGeneratedAt + status=completed.
 * (구 AI generate-report 경로는 410 — 이 엔드포인트로 대체)
 */
export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let force = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    force = body.force === true;
  } catch {
    /* empty body ok */
  }

  try {
    const result = await issueCampaignCompletionReport(id, {
      sendEmail: true,
      markCompleted: true,
      force,
    });

    if (result.reason === "not_found") {
      return json({ error: "Campaign not found" }, 404);
    }

    return json({
      ok: true,
      skipped: result.skipped,
      reason: result.reason ?? null,
      reportGeneratedAt: result.reportGeneratedAt,
      emailed: result.emailed,
      markedCompleted: result.markedCompleted,
      filename: result.filename,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-report/issue]", e);
    return json({ error: msg }, 500);
  }
}
