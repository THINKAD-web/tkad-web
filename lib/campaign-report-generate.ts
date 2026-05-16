import { campaignCompletionPdfToBuffer } from "@/lib/build-campaign-completion-pdf";
import {
  loadCampaignReportPdfParams,
  type BuildCampaignReportOptions,
} from "@/lib/campaign-report-build-params";
import type { GenerateCampaignReportResult } from "@/lib/campaign-report-types";
import { uploadToBunnyStorage, isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { sendEmailWithPdfAttachment, isEmailConfigured } from "@/lib/email/client";
import { getPrisma } from "@/lib/prisma";

function buildReportFilename(clientCompany: string, campaignId: string): {
  display: string;
  ascii: string;
} {
  const raw = clientCompany.trim() || "클라이언트미지정";
  const safe = raw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const display = `${safe}_THINKAD_옥외광고_성과보고서_${yyyymm}.pdf`;
  const ascii = `THINKAD-OOH-Report-${campaignId.slice(0, 8)}-${yyyymm}.pdf`;
  return { display, ascii };
}

function buildEmailHtml(brand: string, periodText: string, pdfUrl: string | null) {
  const linkBlock = pdfUrl
    ? `<p><a href="${pdfUrl}" style="color:#FF6600">온라인에서 PDF 보기</a></p>`
    : "";
  return `<div style="font-family:sans-serif;color:#111;max-width:560px">
  <p style="border-left:4px solid #FF6600;padding-left:12px;font-weight:700">THINKAD 캠페인 성과 보고서</p>
  <p><strong>${brand}</strong> 캠페인 집행 결과 리포트를 첨부합니다.</p>
  <p>집행 기간: ${periodText}</p>
  ${linkBlock}
  <p style="font-size:12px;color:#666">문의: sales@tkad.co.kr · 02-515-2772</p>
</div>`;
}

export async function generateCampaignReport(
  campaignId: string,
  options: BuildCampaignReportOptions & {
    sendEmail?: boolean;
    skipUpload?: boolean;
  } = {},
): Promise<GenerateCampaignReportResult> {
  const params = await loadCampaignReportPdfParams(campaignId, options);
  const pdfBuffer = await campaignCompletionPdfToBuffer(params);

  const filename = buildReportFilename(
    params.clientCompany,
    campaignId,
  ).display;

  let pdfUrl: string | null = null;
  const generatedAt = new Date().toISOString();

  if (!options.skipUpload) {
    if (!isBunnyStorageConfigured()) {
      throw new Error("BUNNY_STORAGE_NOT_CONFIGURED");
    }
    const path = `tkad/campaign-reports/${campaignId}/${Date.now()}_${filename.replace(/[^\w.-]+/g, "_")}`;
    const uploaded = await uploadToBunnyStorage({
      path,
      bytes: pdfBuffer.buffer.slice(
        pdfBuffer.byteOffset,
        pdfBuffer.byteOffset + pdfBuffer.byteLength,
      ) as ArrayBuffer,
      contentType: "application/pdf",
    });
    pdfUrl = uploaded.publicUrl;

    const db = getPrisma();
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        completionReportUrl: pdfUrl,
        completionReportGeneratedAt: new Date(generatedAt),
      },
    });
  }

  let emailSent = false;
  let emailError: string | undefined;

  if (options.sendEmail && params.clientEmail?.trim()) {
    if (!isEmailConfigured()) {
      emailError = "EMAIL_NOT_CONFIGURED";
    } else {
      try {
        const periodText =
          params.startDate && params.endDate
            ? `${new Date(params.startDate).toLocaleDateString("ko-KR")} ~ ${new Date(params.endDate).toLocaleDateString("ko-KR")}`
            : "—";
        await sendEmailWithPdfAttachment({
          to: params.clientEmail.trim(),
          subject: `[THINKAD] ${params.brandDisplayName ?? params.clientCompany} 옥외광고 성과 보고서`,
          html: buildEmailHtml(
            params.brandDisplayName ?? params.clientCompany,
            periodText,
            pdfUrl,
          ),
          text: `THINKAD 캠페인 성과 보고서 (${params.brandDisplayName ?? params.clientCompany})`,
          pdfFilename: filename,
          pdfBase64: pdfBuffer.toString("base64"),
        });
        emailSent = true;

        const sales = process.env.REPORT_CC_EMAIL?.trim() || "sales@tkad.co.kr";
        if (sales !== params.clientEmail.trim()) {
          await sendEmailWithPdfAttachment({
            to: sales,
            subject: `[THINKAD 내부] ${params.brandDisplayName ?? params.clientCompany} 리포트 발송 완료`,
            text: `광고주 ${params.clientEmail} 에게 리포트를 발송했습니다.`,
            pdfFilename: filename,
            pdfBase64: pdfBuffer.toString("base64"),
          }).catch(() => {});
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  try {
    const db = getPrisma();
    await db.generationLog.create({
      data: {
        type: "campaign_completion_pdf",
        targetId: campaignId,
        prompt: JSON.stringify({
          brandName: options.brandName,
          mediaIds: options.mediaIds,
          sendEmail: options.sendEmail,
        }),
        response: JSON.stringify({ pdfUrl, emailSent, emailError }),
        model: "jspdf-completion-v1",
        status: pdfUrl || options.skipUpload ? "ok" : "partial",
        errorMsg: emailError ?? null,
      },
    });
  } catch {
    /* audit log optional */
  }

  return {
    campaignId,
    pdfUrl,
    filename,
    generatedAt,
    emailSent,
    emailError,
  };
}
