/**
 * 영업팀 견적 알림 이메일 발송.
 *
 * 환경변수:
 *   SALES_TEAM_EMAILS — 영업팀 수신자 (콤마 구분, 예: "ops@thinkad.kr,sales@thinkad.kr").
 *                       미설정 시 silent skip.
 *
 * 본 헬퍼는 사용자에게 보내는 PDF 첨부 메일과 분리된, 영업팀 전용 텍스트 알림이다.
 * 첨부는 포함하지 않고 어드민 링크 + 핵심 요약만 노출(영업팀이 어드민에서 PDF 다시 열람).
 */

import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import type { QuoteSlackPayload } from "@/lib/quote/notifiers/sales-slack";

function pickRecipients(): string[] {
  const raw = process.env.SALES_TEAM_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function trimText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function buildSubject(p: QuoteSlackPayload): string {
  const num = p.quoteNumber ? ` ${p.quoteNumber}` : "";
  const company = p.clientCompany ? ` (${p.clientCompany})` : "";
  return `[싱커드] 새 견적${num} — ${p.clientName}${company} · ₩${p.totalAmountMan.toLocaleString("ko-KR")}만`;
}

function buildHtml(p: QuoteSlackPayload): string {
  const messageBlock = p.message?.trim()
    ? `<tr><td style="color:#64748b;padding:6px 0;">추가 요청</td><td style="white-space:pre-wrap;">${trimText(
        p.message.trim().replace(/</g, "&lt;"),
        2000,
      )}</td></tr>`
    : "";
  const safeCompany = (p.clientCompany ?? "—").replace(/</g, "&lt;");
  const safeName = p.clientName.replace(/</g, "&lt;");
  return `<!doctype html><html><body style="font-family:system-ui,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0d1b2e;color:#d4af37;padding:20px 24px;font-size:13px;font-weight:700;letter-spacing:0.1em;">THINKAD · 영업 알림</div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a;">새 견적 요청${
        p.quoteNumber ? ` · ${p.quoteNumber}` : ""
      }</h2>
      <p style="margin:0 0 18px;color:#475569;font-size:13px;">
        ${safeName}${p.clientCompany ? ` · ${safeCompany}` : ""} 가 견적을 요청했습니다.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="color:#64748b;padding:6px 0;width:90px;">담당자</td><td>${safeName}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">회사</td><td>${safeCompany}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">이메일</td><td>${p.clientEmail ?? "—"}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">연락처</td><td>${p.clientPhone ?? "—"}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">매체 수</td><td>${p.mediaCount}건</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">기간</td><td>${p.periodLabel}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">총액</td><td><strong>₩${p.totalAmountMan.toLocaleString(
          "ko-KR",
        )}만</strong></td></tr>
        ${messageBlock}
      </table>
      <p style="margin:24px 0 0;">
        <a href="${p.adminUrl}" style="display:inline-block;background:#d4af37;color:#0d1b2e;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">어드민에서 보기</a>
      </p>
      <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;">발송 시각: ${new Date().toISOString()}</p>
    </div>
  </div>
</body></html>`;
}

function buildText(p: QuoteSlackPayload): string {
  const lines = [
    `새 견적 요청${p.quoteNumber ? ` (${p.quoteNumber})` : ""}`,
    "",
    `담당자: ${p.clientName}`,
    `회사: ${p.clientCompany ?? "—"}`,
    `이메일: ${p.clientEmail ?? "—"}`,
    `연락처: ${p.clientPhone ?? "—"}`,
    `매체: ${p.mediaCount}건 · ${p.periodLabel}`,
    `총액: ₩${p.totalAmountMan.toLocaleString("ko-KR")}만`,
  ];
  if (p.message?.trim()) {
    lines.push("", "추가 요청:", trimText(p.message.trim(), 2000));
  }
  lines.push("", `어드민에서 보기: ${p.adminUrl}`);
  return lines.join("\n");
}

export async function sendQuoteSalesEmail(
  payload: QuoteSlackPayload,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const recipients = pickRecipients();
  if (recipients.length === 0) return { ok: false, skipped: true };
  if (!isEmailConfigured()) {
    return { ok: false, skipped: true, error: "email-not-configured" };
  }

  try {
    // sendEmail 의 to 는 단일 문자열 또는 콤마 결합. Resend 는 배열도 받지만 SMTP fallback
    // 호환을 위해 여기서 모두에게 동일 메일을 한 번에 발송(콤마 결합).
    await sendEmail({
      to: recipients.join(", "),
      subject: buildSubject(payload),
      text: buildText(payload),
      html: buildHtml(payload),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[quote-sales-email] failed:", msg);
    return { ok: false, error: msg };
  }
}
