export type InquiryTypeCode = "media" | "campaign" | "quote" | "other";
export type BudgetCode = "under_10m" | "10m_50m" | "50m_100m" | "over_100m";

const INQUIRY_TYPES: readonly InquiryTypeCode[] = [
  "media",
  "campaign",
  "quote",
  "other",
];

const BUDGET_CODES: readonly BudgetCode[] = [
  "under_10m",
  "10m_50m",
  "50m_100m",
  "over_100m",
];

export function parseInquiryTypeCode(
  raw: string | undefined,
): InquiryTypeCode | null {
  if (!raw) return null;
  return INQUIRY_TYPES.includes(raw as InquiryTypeCode)
    ? (raw as InquiryTypeCode)
    : null;
}

export function parseBudgetCode(raw: string | undefined): BudgetCode | null {
  if (!raw) return null;
  return BUDGET_CODES.includes(raw as BudgetCode) ? (raw as BudgetCode) : null;
}

const INQUIRY_LABELS: Record<
  InquiryTypeCode,
  { ko: string; en: string }
> = {
  media: { ko: "매체 문의", en: "Media inquiry" },
  campaign: { ko: "캠페인 상담", en: "Campaign consultation" },
  quote: { ko: "견적 요청", en: "Quote request" },
  other: { ko: "기타", en: "Other" },
};

const BUDGET_LABELS: Record<BudgetCode, { ko: string; en: string }> = {
  under_10m: { ko: "1천만 이하", en: "Under ₩10M" },
  "10m_50m": { ko: "1천~5천만", en: "₩10M–50M" },
  "50m_100m": { ko: "5천만~1억", en: "₩50M–100M" },
  over_100m: { ko: "1억 이상", en: "Over ₩100M" },
};

export function inquiryTypeLabel(
  code: InquiryTypeCode,
  locale: string,
): string {
  const row = INQUIRY_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function budgetLabel(code: BudgetCode, locale: string): string {
  const row = BUDGET_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function composeStoredMessage(
  inquiryLabel: string,
  userMessage: string,
  locale: string,
  budgetLbl?: string,
): string {
  const header =
    locale === "ko"
      ? `[문의 유형: ${inquiryLabel}]`
      : `[Inquiry type: ${inquiryLabel}]`;
  const budgetLine =
    budgetLbl != null && budgetLbl !== ""
      ? locale === "ko"
        ? `\n[예상 예산: ${budgetLbl}]`
        : `\n[Estimated budget: ${budgetLbl}]`
      : "";
  return `${header}${budgetLine}\n\n${userMessage.trim()}`;
}
