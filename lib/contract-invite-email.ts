import { isEmailConfigured, sendEmail } from "@/lib/email/client";

export function contractSignPageUrl(
  quoteId: string,
  locale: "ko" | "en",
): string {
  const base = (
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");
  const loc = locale === "en" ? "en" : "ko";
  return `${base}/${loc}/quote/${quoteId}/contract`;
}

export type ContractInviteEmailVariant = "standard" | "booking_confirmed";

/** 부킹 확정·standalone 발송·재발송 — 고객에게 전자서명 URL 안내 */
export async function sendContractInviteEmail(input: {
  to: string;
  clientName: string;
  locale: "ko" | "en";
  quoteId: string;
  variant?: ContractInviteEmailVariant;
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to || !isEmailConfigured()) return false;

  const isKo = input.locale !== "en";
  const url = contractSignPageUrl(input.quoteId, input.locale);
  const booking = input.variant === "booking_confirmed";

  try {
    await sendEmail({
      to,
      subject: isKo
        ? booking
          ? "[싱커드] 부킹 확정 — 전자계약서를 확인해 주세요"
          : "[싱커드] 전자계약서를 확인해 주세요"
        : booking
          ? "[THINKAD] Booking confirmed — please review your e-contract"
          : "[THINKAD] Please review your e-contract",
      text: isKo
        ? booking
          ? `안녕하세요 ${input.clientName}님,\n\n부킹이 확정되었습니다. 아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.\n\n${url}\n\n감사합니다.`
          : `안녕하세요 ${input.clientName}님,\n\n아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.\n\n${url}\n\n감사합니다.`
        : booking
          ? `Hello ${input.clientName},\n\nYour booking is confirmed. Please open the link to review and sign the contract:\n\n${url}\n\nThank you.`
          : `Hello ${input.clientName},\n\nPlease open the link below to review and sign your contract:\n\n${url}\n\nThank you.`,
      html: isKo
        ? booking
          ? `<p>안녕하세요 <strong>${input.clientName}</strong>님,</p><p>부킹이 확정되었습니다. 아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.</p><p><a href="${url}">${url}</a></p>`
          : `<p>안녕하세요 <strong>${input.clientName}</strong>님,</p><p>아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.</p><p><a href="${url}">${url}</a></p>`
        : booking
          ? `<p>Hello <strong>${input.clientName}</strong>,</p><p>Your booking is confirmed. Please review and sign:</p><p><a href="${url}">${url}</a></p>`
          : `<p>Hello <strong>${input.clientName}</strong>,</p><p>Please review and sign your contract:</p><p><a href="${url}">${url}</a></p>`,
    });
    return true;
  } catch (e) {
    console.error("[contract-invite-email]", e);
    return false;
  }
}
