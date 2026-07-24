import { CampaignStatus, type PrismaClient } from "@prisma/client";
import { buildCampaignCompletionReportPdfBuffer } from "@/lib/campaign-completion-report";
import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";
import { getPrisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export type IssueCampaignCompletionReportOpts = {
  /** PDF 첨부 이메일 발송 (기본 true) */
  sendEmail?: boolean;
  /** status → completed (기본 true) */
  markCompleted?: boolean;
  /**
   * 이미 reportGeneratedAt 이 있어도 재생성·재발송.
   * cron 은 false(기본)로 멱등 스킵.
   */
  force?: boolean;
  db?: PrismaClient;
};

export type IssueCampaignCompletionReportResult = {
  campaignId: string;
  skipped: boolean;
  reason?: "already_issued" | "not_found";
  reportGeneratedAt: string | null;
  emailed: boolean;
  markedCompleted: boolean;
  filename: string;
  pdfBase64: string | null;
};

function buildClientReportFilename(
  clientCompany: string | null | undefined,
): string {
  const raw = (clientCompany ?? "").trim() || "클라이언트미지정";
  const safe = raw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${safe}_THINKAD_옥외광고_성과보고서_${yyyymm}.pdf`;
}

/**
 * 완료 리포트 발행: PDF 생성 → reportGeneratedAt 기록 → (선택) Resend 발송 → completed.
 * AI 파이프라인 없음. 기존 PDF/email 패턴 재사용.
 */
export async function issueCampaignCompletionReport(
  campaignId: string,
  opts?: IssueCampaignCompletionReportOpts,
): Promise<IssueCampaignCompletionReportResult> {
  const db = opts?.db ?? getPrisma();
  const sendEmail = opts?.sendEmail !== false;
  const markCompleted = opts?.markCompleted !== false;
  const force = opts?.force === true;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientEmail: true,
      clientCompany: true,
      status: true,
      reportGeneratedAt: true,
    },
  });

  if (!campaign) {
    return {
      campaignId,
      skipped: true,
      reason: "not_found",
      reportGeneratedAt: null,
      emailed: false,
      markedCompleted: false,
      filename: "",
      pdfBase64: null,
    };
  }

  if (campaign.reportGeneratedAt && !force) {
    return {
      campaignId,
      skipped: true,
      reason: "already_issued",
      reportGeneratedAt: campaign.reportGeneratedAt.toISOString(),
      emailed: false,
      markedCompleted: false,
      filename: buildClientReportFilename(campaign.clientCompany),
      pdfBase64: null,
    };
  }

  const buf = await buildCampaignCompletionReportPdfBuffer(campaignId);
  const filename = buildClientReportFilename(campaign.clientCompany);
  const pdfBase64 = buf.toString("base64");
  const now = new Date();

  const updated = await db.campaign.update({
    where: { id: campaignId },
    data: {
      reportGeneratedAt: now,
      ...(markCompleted ? { status: CampaignStatus.completed } : {}),
    },
    select: { reportGeneratedAt: true, status: true },
  });

  let emailed = false;
  const to = campaign.clientEmail?.trim() ?? "";
  if (sendEmail && to && isEmailConfigured()) {
    const dash = `${siteUrl}/dashboard/campaigns/${campaignId}`;
    const reportApi = `${siteUrl}/api/my/dashboard/campaigns/${campaignId}/report`;
    await sendEmailWithPdfAttachment({
      to,
      subject: `[THINKAD] 결과 리포트 — ${campaign.name}`,
      text: `안녕하세요 ${campaign.clientName}님,\n\n「${campaign.name}」캠페인 결과 리포트(PDF)를 첨부합니다.\n\n대시보드: ${dash}\nPDF 다시 받기: ${reportApi}\n`,
      html: `<p>안녕하세요 <strong>${campaign.clientName}</strong>님,</p>
<p>「${campaign.name}」캠페인 <strong>결과 리포트</strong>를 첨부합니다.</p>
<p>리포트의 「예측 vs 검증된 추정치」는 생성 시점 재계산값이며, 센서 절대 실측이 아닙니다.</p>
<p><a href="${dash}">대시보드에서 확인 →</a> · <a href="${reportApi}">PDF 다시 받기 →</a></p>`,
      pdfFilename: filename,
      pdfBase64,
    });
    emailed = true;
  }

  return {
    campaignId,
    skipped: false,
    reportGeneratedAt: updated.reportGeneratedAt?.toISOString() ?? now.toISOString(),
    emailed,
    markedCompleted: markCompleted,
    filename,
    pdfBase64,
  };
}
