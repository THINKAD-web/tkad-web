import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { generateCampaignReport } from "@/lib/campaign-report-generate";
import { GenerateCampaignReportBodySchema } from "@/lib/campaign-report-types";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/reports/generate
 * 캠페인 완료 PDF 생성 → Bunny CDN 업로드 → URL 반환 (선택: 광고주 이메일 발송)
 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", 400);
  }

  const parsed = GenerateCampaignReportBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", 400, {
      issues: parsed.error.issues,
    });
  }

  const d = parsed.data;

  try {
    const result = await generateCampaignReport(d.campaignId, {
      brandName: d.brandName,
      period: d.period,
      mediaIds: d.mediaIds,
      metrics: d.metrics,
      accountManager: d.accountManager,
      nextCampaignProposal: d.nextCampaignProposal,
      sendEmail: d.sendEmail,
      skipUpload: d.skipUpload,
    });

    return apiOk(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Campaign not found")) {
      return apiError("NOT_FOUND", 404, { message: msg });
    }
    if (msg.includes("BUNNY_STORAGE_NOT_CONFIGURED")) {
      return apiError("STORAGE_NOT_CONFIGURED", 503, {
        message: "Bunny Storage 환경 변수가 필요합니다.",
      });
    }
    return apiServerError(e, "reports/generate");
  }
}
