import type { PrismaClient } from "@prisma/client";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { getFormalQuoteIssuer } from "@/lib/formal-quote-issuer";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveMediaNamesForQuote,
} from "@/lib/ooh-contract-context";
import { parseOohContractMeta } from "@/lib/ooh-contract-meta";
import { splitPdfLogicalLines } from "@/lib/pdf-line-break";
import { getPrisma } from "@/lib/prisma";

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

export type ContractInviteEmailPayload = {
  isKo: boolean;
  clientName: string;
  contractUrl: string;
  previewUrl?: string;
  issuerCompany: string;
  accountManagerName: string;
  mediaNames: string[];
  amountLabel: string;
  period: string;
  contactEmail: string;
  contactPhone: string;
  variant?: ContractInviteEmailVariant;
};

export type ContractInviteEmailOptions = {
  subject?: string;
  variant?: ContractInviteEmailVariant;
};

function defaultSubject(
  isKo: boolean,
  variant: ContractInviteEmailVariant,
): string {
  const booking = variant === "booking_confirmed";
  if (isKo) {
    return booking
      ? "[싱커드] 부킹 확정 — 전자계약서를 확인해 주세요"
      : "[싱커드] 전자계약서를 확인해 주세요";
  }
  return booking
    ? "[THINKAD] Booking confirmed — please review your e-contract"
    : "[THINKAD] Please review your e-contract";
}

export async function resolveContractInviteEmailPayload(
  db: PrismaClient,
  quoteId: string,
): Promise<ContractInviteEmailPayload | null> {
  const row = await loadOoHQuoteForContract(db, quoteId);
  if (!row) return null;

  const isKo = row.locale !== "en";
  const issuer = getFormalQuoteIssuer();
  const meta = parseOohContractMeta(row.adminNote);
  const mediaNames = await resolveMediaNamesForQuote(db, row.mediaIds, isKo);
  const contractId = row.oohContract?.id ?? quoteId;
  const pdfVars = ooHQuoteToContractPdfVars(row, mediaNames, contractId);

  const accountManagerName =
    meta.accountManagerName?.trim() ||
    process.env.QUOTE_ACCOUNT_MANAGER_NAME?.trim() ||
    (isKo ? issuer.salesTitle : "THINKAD Sales");

  const period = splitPdfLogicalLines(
    pdfVars.period ?? `${pdfVars.periodStart} ~ ${pdfVars.periodEnd}`,
  )
    .map((l) => l.trim())
    .filter(Boolean)
    .join(isKo ? " · " : " · ");

  return {
    isKo,
    clientName: row.clientName,
    contractUrl: contractSignPageUrl(
      quoteId,
      row.locale === "en" ? "en" : "ko",
    ),
    issuerCompany: isKo ? issuer.companyKo : issuer.companyEn,
    accountManagerName,
    mediaNames,
    amountLabel: pdfVars.totalAmount ?? pdfVars.amountLine ?? "",
    period,
    contactEmail: meta.accountManagerEmail?.trim() || issuer.email,
    contactPhone: meta.accountManagerPhone?.trim() || issuer.tel,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildContractInviteEmail(
  p: ContractInviteEmailPayload,
  options?: ContractInviteEmailOptions,
): { subject: string; text: string; html: string } {
  const variant = options?.variant ?? p.variant ?? "standard";
  const booking = variant === "booking_confirmed";

  const mediaBlock =
    p.mediaNames.length > 0
      ? p.mediaNames.map((m) => `· ${m}`).join("\n")
      : p.isKo
        ? "(매체 정보는 계약서에서 확인)"
        : "(See contract for media details)";

  const contactLine = p.isKo
    ? `궁금한 점이 있으시면 ${p.accountManagerName} 담당자에게 ${p.contactEmail} 또는 ${p.contactPhone}으로 연락 주세요.`
    : `Questions? Contact ${p.accountManagerName} at ${p.contactEmail} or ${p.contactPhone}.`;

  const subject =
    options?.subject ?? defaultSubject(p.isKo, variant);

  const introKo = booking
    ? `${p.issuerCompany}입니다. 부킹이 확정되었습니다. 아래 내용을 확인한 뒤 전자계약서에 서명해 주세요.`
    : `${p.issuerCompany}입니다. 아래 내용을 확인한 뒤 전자계약서에 서명해 주세요.`;
  const introEn = booking
    ? `${p.issuerCompany} — your booking is confirmed. Please review and sign the e-contract.`
    : `${p.issuerCompany} — please review the details below and sign the e-contract.`;

  const previewText = p.previewUrl
    ? p.isKo
      ? `견적 미리보기: ${p.previewUrl}\n`
      : `Quote preview: ${p.previewUrl}\n`
    : "";
  const previewHtml = p.previewUrl
    ? p.isKo
      ? `<p><a href="${escapeHtml(p.previewUrl)}">견적 미리보기</a></p>`
      : `<p><a href="${escapeHtml(p.previewUrl)}">View quote</a></p>`
    : "";

  const text = p.isKo
    ? [
        `안녕하세요 ${p.clientName}님,`,
        "",
        introKo,
        "",
        `담당자: ${p.accountManagerName}`,
        `계약 매체:\n${mediaBlock}`,
        `계약 금액: ${p.amountLabel}`,
        `집행 기간: ${p.period}`,
        "",
        previewText,
        `전자계약 링크:\n${p.contractUrl}`,
        "",
        contactLine,
        "",
        "감사합니다.",
        p.issuerCompany,
      ].join("\n")
    : [
        `Hello ${p.clientName},`,
        "",
        introEn,
        "",
        `Account manager: ${p.accountManagerName}`,
        `Media:\n${mediaBlock}`,
        `Contract amount: ${p.amountLabel}`,
        `Campaign period: ${p.period}`,
        "",
        previewText,
        `E-contract:\n${p.contractUrl}`,
        "",
        contactLine,
        "",
        "Thank you.",
        p.issuerCompany,
      ].join("\n");

  const mediaHtml =
    p.mediaNames.length > 0
      ? `<ul>${p.mediaNames.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(mediaBlock)}</p>`;

  const html = p.isKo
    ? `<p>안녕하세요 <strong>${escapeHtml(p.clientName)}</strong>님,</p>
<p><strong>${escapeHtml(p.issuerCompany)}</strong>입니다. ${booking ? "부킹이 확정되었습니다. " : ""}아래 내용을 확인한 뒤 전자계약서에 서명해 주세요.</p>
<table style="border-collapse:collapse;font-size:14px;line-height:1.5">
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">담당자</td><td>${escapeHtml(p.accountManagerName)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">계약 매체</td><td>${mediaHtml}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">계약 금액</td><td>${escapeHtml(p.amountLabel)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">집행 기간</td><td>${escapeHtml(p.period)}</td></tr>
</table>
${previewHtml}
<p style="margin-top:16px"><a href="${escapeHtml(p.contractUrl)}">전자계약서 열기</a></p>
<p style="color:#444">${escapeHtml(contactLine)}</p>
<p>감사합니다.<br/>${escapeHtml(p.issuerCompany)}</p>`
    : `<p>Hello <strong>${escapeHtml(p.clientName)}</strong>,</p>
<p><strong>${escapeHtml(p.issuerCompany)}</strong> — ${booking ? "your booking is confirmed. " : ""}Please review and sign.</p>
<table style="border-collapse:collapse;font-size:14px;line-height:1.5">
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Account manager</td><td>${escapeHtml(p.accountManagerName)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Media</td><td>${mediaHtml}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Amount</td><td>${escapeHtml(p.amountLabel)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">Period</td><td>${escapeHtml(p.period)}</td></tr>
</table>
${previewHtml}
<p style="margin-top:16px"><a href="${escapeHtml(p.contractUrl)}">Open e-contract</a></p>
<p style="color:#444">${escapeHtml(contactLine)}</p>
<p>Thank you.<br/>${escapeHtml(p.issuerCompany)}</p>`;

  return { subject, text, html };
}

/** 부킹 확정·standalone 발송·재발송 — 고객에게 전자서명 URL 안내 */
export async function sendContractInviteEmail(input: {
  to: string;
  clientName: string;
  locale: "ko" | "en";
  quoteId: string;
  variant?: ContractInviteEmailVariant;
  previewUrl?: string;
  subject?: string;
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to || !isEmailConfigured()) return false;

  const variant = input.variant ?? "standard";

  try {
    const db = getPrisma();
    const payload = await resolveContractInviteEmailPayload(db, input.quoteId);
    if (payload) {
      const mail = buildContractInviteEmail(
        {
          ...payload,
          clientName: input.clientName,
          contractUrl: contractSignPageUrl(input.quoteId, input.locale),
          previewUrl: input.previewUrl,
          variant,
        },
        { subject: input.subject, variant },
      );
      await sendEmail({ to, ...mail });
      return true;
    }

    const isKo = input.locale !== "en";
    const url = contractSignPageUrl(input.quoteId, input.locale);
    const booking = variant === "booking_confirmed";
    const mail = buildContractInviteEmail(
      {
        isKo,
        clientName: input.clientName,
        contractUrl: url,
        previewUrl: input.previewUrl,
        issuerCompany: isKo ? "(주)싱커드" : "THINKAD Inc.",
        accountManagerName:
          process.env.QUOTE_ACCOUNT_MANAGER_NAME?.trim() || "THINKAD Sales",
        mediaNames: [],
        amountLabel: isKo ? "(계약서에서 확인)" : "(See contract)",
        period: isKo ? "(계약서에서 확인)" : "(See contract)",
        contactEmail: getFormalQuoteIssuer().email,
        contactPhone: getFormalQuoteIssuer().tel,
        variant,
      },
      { subject: input.subject, variant },
    );
    await sendEmail({ to, ...mail });
    return true;
  } catch (e) {
    console.error("[contract-invite-email]", e);
    return false;
  }
}
