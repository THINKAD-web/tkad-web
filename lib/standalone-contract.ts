import { z } from "zod";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";

/** localStorage / 향후 파이프라인 bridge용 초안 스키마 버전 */
export const STANDALONE_CONTRACT_DRAFT_VERSION = 1;

export const StandaloneContractPreviewBody = z.object({
  clientCompany: z.string().max(120).optional().default(""),
  clientName: z.string().min(1).max(80),
  mediaLines: z.array(z.string().min(1).max(200)).max(50).default([]),
  period: z.string().min(1).max(120),
  /** OoHQuote.totalAmount 와 동일 — 만원 단위 */
  totalAmountManwon: z.number().int().positive().max(999_999_999),
  specialTerms: z.string().max(8000).optional().nullable(),
  locale: z.enum(["ko", "en"]).default("ko"),
  download: z.boolean().optional().default(false),
});

export type StandaloneContractPreviewInput = z.infer<
  typeof StandaloneContractPreviewBody
>;

/** 저장·파이프라인 연결 확장용 (이번 스프린트 미구현) */
export type StandaloneContractDraft = StandaloneContractPreviewInput & {
  version: typeof STANDALONE_CONTRACT_DRAFT_VERSION;
  draftId: string;
  mediaIds: string[];
  createdAt: string;
  /** 향후 OoHQuote bridge 시 연결 ID */
  linkedOoHQuoteId?: string | null;
};

export function newStandaloneContractDraftId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `DRAFT-${stamp}`;
}

export function buildAdvertiserLine(
  input: Pick<StandaloneContractPreviewInput, "clientCompany" | "clientName">,
  isKo: boolean,
): string {
  const company = input.clientCompany.trim();
  const name = input.clientName.trim();
  if (company) {
    return isKo ? `${company} (${name})` : `${company} — ${name}`;
  }
  return name;
}

export function buildContractAmountLine(
  totalAmountManwon: number,
  isKo: boolean,
): string {
  const fmt = isKo ? "ko-KR" : "en-US";
  return isKo
    ? `총 광고 집행 금액(참고, 부가세 별도, 만원): ₩${totalAmountManwon.toLocaleString(fmt)}`
    : `Total media fee (excl. VAT, 10K KRW units): ₩${totalAmountManwon.toLocaleString(fmt)}`;
}

export function standaloneContractToPdfVars(
  input: StandaloneContractPreviewInput,
  draftId: string,
): OohContractPdfVars {
  const isKo = input.locale !== "en";
  return {
    isKo,
    advertiserLine: buildAdvertiserLine(input, isKo),
    mediaLines: input.mediaLines.map((m) => m.trim()).filter(Boolean),
    period: input.period.trim(),
    amountLine: buildContractAmountLine(input.totalAmountManwon, isKo),
    specialTerms: input.specialTerms?.trim() || null,
    contractId: draftId,
  };
}
