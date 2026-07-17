import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { siteUrl } from "@/lib/seo";
import { adminOohQuoteUrl } from "@/lib/telegram-notify";

function adminInquiryUrl(inquiryId: string): string {
  return `${siteUrl.replace(/\/$/, "")}/ko/admin/inquiries`;
}

export async function notifySlackInquiryQuoteDraft(opts: {
  inquiryId: string;
  quoteId: string;
  company: string;
  name: string;
  mediaCount: number;
  totalAmountManwon: number;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  return sendSlackInsightAlert({
    severity: "info",
    title: "새 문의 + 견적 초안 생성됨",
    summary: [
      `*${opts.company || "(회사미입력)"}* · ${opts.name}`,
      `매체 ${opts.mediaCount}건 · ₩${opts.totalAmountManwon.toLocaleString("ko-KR")}만`,
      `문의 ID: \`${opts.inquiryId.slice(0, 12)}…\``,
    ].join("\n"),
    fields: [
      { label: "견적 ID", value: opts.quoteId },
      { label: "상태", value: "draft (자동 초안)" },
    ],
    adminUrl: adminOohQuoteUrl(opts.quoteId),
  });
}

export async function notifySlackQuoteSent(opts: {
  quoteId: string;
  clientName: string;
  totalAmountManwon: number;
  emailed: boolean;
  alimtalk: boolean;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const preview = `${siteUrl.replace(/\/$/, "")}/ko/quote/${opts.quoteId}/preview`;
  return sendSlackInsightAlert({
    severity: "info",
    title: "견적 발송 완료",
    summary: [
      `*${opts.clientName}* · ₩${opts.totalAmountManwon.toLocaleString("ko-KR")}만`,
      `이메일: ${opts.emailed ? "✓" : "—"} · 알림톡: ${opts.alimtalk ? "✓" : "—"}`,
      `<${preview}|광고주 미리보기>`,
    ].join("\n"),
    fields: [{ label: "견적 ID", value: opts.quoteId }],
    adminUrl: adminOohQuoteUrl(opts.quoteId),
    publicUrl: preview,
  });
}

export async function notifySlackQuoteExpiring(opts: {
  quoteId: string;
  clientName: string;
  validUntil: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  return sendSlackInsightAlert({
    severity: "warning",
    title: "견적 만료 D-3",
    summary: `${opts.clientName} · 유효기간 ${opts.validUntil}`,
    adminUrl: adminOohQuoteUrl(opts.quoteId),
  });
}

export async function notifySlackRevisionRequest(opts: {
  quoteId: string;
  clientName: string;
  preview: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  return sendSlackInsightAlert({
    severity: "info",
    title: "견적 수정 요청 (고객)",
    summary: [`*${opts.clientName}*`, opts.preview].join("\n"),
    fields: [
      { label: "견적 ID", value: opts.quoteId },
      { label: "상태", value: "sent → revision requested" },
    ],
    adminUrl: adminOohQuoteUrl(opts.quoteId),
  });
}

export async function notifySlackBookingRequest(opts: {
  quoteId: string;
  clientName: string;
  totalAmountManwon: number;
  period: string;
  mediaCount: number;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  return sendSlackInsightAlert({
    severity: "info",
    title: "부킹 요청 (고객 진행 의사)",
    summary: [
      `*${opts.clientName}* · ₩${opts.totalAmountManwon.toLocaleString("ko-KR")}만 · ${opts.period}`,
      `매체 ${opts.mediaCount}건`,
    ].join("\n"),
    fields: [
      { label: "견적 ID", value: opts.quoteId },
      { label: "상태", value: "booking_requested" },
    ],
    adminUrl: adminOohQuoteUrl(opts.quoteId),
  });
}

export async function notifySlackBookingConfirm(opts: {
  quoteId: string;
  clientName: string;
  totalAmountManwon: number;
  period: string;
  mediaCount: number;
  /** admin | chat | negotiation */
  source?: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const sourceLabel =
    opts.source === "chat"
      ? "채팅 수락"
      : opts.source === "negotiation"
        ? "가격 제안 수락"
        : "어드민 부킹 확정";
  return sendSlackInsightAlert({
    severity: "info",
    title: "부킹 확정",
    summary: [
      `*${opts.clientName}* · ₩${opts.totalAmountManwon.toLocaleString("ko-KR")}만 · ${opts.period}`,
      `매체 ${opts.mediaCount}건 · ${sourceLabel}`,
    ].join("\n"),
    fields: [
      { label: "견적 ID", value: opts.quoteId },
      { label: "상태", value: "booking_confirmed" },
      { label: "경로", value: sourceLabel },
    ],
    adminUrl: adminOohQuoteUrl(opts.quoteId),
  });
}

export { adminInquiryUrl };
