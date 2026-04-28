import {
  STATUS_LABEL,
  FINANCIAL_DOC_KIND_LABEL,
  FINANCIAL_DOC_STATUS_LABEL,
} from "@/app/[locale]/admin/(dashboard)/campaigns/constants";

/** 캠페인 status DB 값 → 한글 (미리보기 / PDF 공통) */
export function formatCampaignStatusKo(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  return (STATUS_LABEL as Record<string, string>)[raw] ?? raw;
}

export function formatFinancialDocKindKo(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  return (FINANCIAL_DOC_KIND_LABEL as Record<string, string>)[raw] ?? raw;
}

export function formatFinancialDocStatusKo(
  raw: string | null | undefined,
): string {
  if (raw == null || raw === "") return "—";
  return (FINANCIAL_DOC_STATUS_LABEL as Record<string, string>)[raw] ?? raw;
}
