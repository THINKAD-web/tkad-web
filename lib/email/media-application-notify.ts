import type { MediaApplication } from "@prisma/client";
import { labelMediaApplicationType } from "@/lib/media-application";
import { siteUrl } from "@/lib/seo";

export function getMediaApplicationAdminEmail(app: MediaApplication): {
  subject: string;
  text: string;
  html: string;
} {
  const adminUrl = `${siteUrl}/ko/admin/applications?id=${app.id}`;
  const typeLabel = labelMediaApplicationType(app.mediaType, true);
  const subject = `[THINKAD] 매체 등록 신청 — ${app.mediaName} (${app.companyName})`;
  const lines = [
    `신청 ID: ${app.id}`,
    `매체명: ${app.mediaName}`,
    `유형: ${typeLabel}`,
    `주소: ${app.address}${app.addressDetail ? ` ${app.addressDetail}` : ""}`,
    `월 단가: ${app.monthlyPrice.toLocaleString("ko-KR")}원`,
    `신청사: ${app.companyName}`,
    `담당: ${app.contactName} / ${app.contactPhone} / ${app.contactEmail}`,
    "",
    `어드민: ${adminUrl}`,
  ];
  const text = lines.join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px">
      <h2 style="color:#FF6600">매체 등록 신청 접수</h2>
      <p><strong>${app.mediaName}</strong> · ${app.companyName}</p>
      <ul style="line-height:1.6;padding-left:1.2em">
        <li>유형: ${typeLabel}</li>
        <li>주소: ${app.address}</li>
        <li>월 단가: ${app.monthlyPrice.toLocaleString("ko-KR")}원</li>
        <li>담당: ${app.contactName} (${app.contactEmail})</li>
      </ul>
      <p><a href="${adminUrl}" style="color:#FF6600;font-weight:bold">어드민에서 확인</a></p>
    </div>
  `.replace("</div>", "</div>");
  return { subject, text, html };
}

export function getMediaApplicationConfirmationEmail(
  app: MediaApplication,
  isKo: boolean,
): { subject: string; text: string; html: string } {
  const subject = isKo
    ? `[THINKAD] 매체 등록 신청이 접수되었습니다`
    : `[THINKAD] Your media registration was received`;
  const text = isKo
    ? `안녕하세요 ${app.contactName}님,\n\n「${app.mediaName}」 매체 등록 신청이 접수되었습니다. 심사 후 이메일로 안내드리겠습니다.\n\nTHINKAD`
    : `Hi ${app.contactName},\n\nWe received your application for "${app.mediaName}". We will email you after review.\n\nTHINKAD`;
  const html = isKo
    ? `<p>안녕하세요 <strong>${app.contactName}</strong>님,</p><p>「<strong>${app.mediaName}</strong>」 매체 등록 신청이 접수되었습니다. 심사에는 영업일 기준 수일이 소요될 수 있습니다.</p><p>THINKAD</p>`
    : `<p>Hi <strong>${app.contactName}</strong>,</p><p>We received your application for <strong>${app.mediaName}</strong>.</p><p>THINKAD</p>`;
  return { subject, text, html };
}
