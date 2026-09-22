import { z } from "zod";
import {
  buildKoOohContractPdfVars,
  parseStandaloneIsoDates,
} from "@/lib/ooh-contract-pdf-vars";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";
import { buildContractMoney, supplyWonFromManwonField } from "@/lib/contract-money";
import {
  defaultContractPaymentMethodKo,
  defaultProductionCostKo,
  formatContractMediaCount,
} from "@/lib/ooh-contract-format";

/** localStorage / 향후 파이프라인 bridge용 초안 스키마 버전 */
export const STANDALONE_CONTRACT_DRAFT_VERSION = 2;

const optionalClientEmail = z
  .string()
  .max(254)
  .optional()
  .default("")
  .refine(
    (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    { message: "invalid_client_email" },
  );

export const StandaloneContractPreviewBody = z.object({
  clientCompany: z.string().max(120).optional().default(""),
  clientName: z.string().min(1).max(80),
  clientRepName: z.string().max(80).optional().default(""),
  clientAddress: z.string().max(200).optional().default(""),
  clientPhone: z.string().max(40).optional().default(""),
  campaignName: z.string().max(200).optional().default(""),
  productionCost: z.string().max(120).optional().default(""),
  mediaCount: z.string().max(40).optional().default(""),
  paymentMethod: z.string().max(120).optional().default(""),
  /** 발송·파이프라인 bridge 메타 — PDF 본문에는 미포함 */
  clientEmail: optionalClientEmail,
  mediaLines: z.array(z.string().min(1).max(200)).max(50).default([]),
  period: z.string().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** OoHQuote.totalAmount 와 동일 — 만원 단위 (VAT 별도) */
  totalAmountManwon: z.number().int().positive().max(999_999_999),
  extraProductionWon: z.number().int().nonnegative().max(50_000_000_000).optional(),
  extraInstallWon: z.number().int().nonnegative().max(50_000_000_000).optional(),
  extraOtherWon: z.number().int().nonnegative().max(50_000_000_000).optional(),
  specialTerms: z.string().max(8000).optional().nullable(),
  locale: z.enum(["ko", "en"]).default("ko"),
  download: z.boolean().optional().default(false),
});

export type StandaloneContractPreviewInput = z.infer<
  typeof StandaloneContractPreviewBody
>;

const requiredClientEmail = z
  .string()
  .min(1)
  .max(254)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), {
    message: "invalid_client_email",
  });

/** Standalone → OoHQuote + 전자서명 URL 발송 */
export const StandaloneContractSendBody = StandaloneContractPreviewBody.extend({
  draftId: z.string().min(1).max(64).optional(),
  mediaIds: z.array(z.string().min(1).max(64)).min(1).max(50),
  clientEmail: requiredClientEmail,
  force: z.boolean().optional().default(false),
});

export type StandaloneContractSendBodyInput = z.infer<
  typeof StandaloneContractSendBody
>;

/** 저장·파이프라인 연결 확장용 */
export type StandaloneContractDraft = StandaloneContractPreviewInput & {
  version: typeof STANDALONE_CONTRACT_DRAFT_VERSION;
  draftId: string;
  mediaIds: string[];
  createdAt: string;
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

function resolveStandaloneDates(input: StandaloneContractPreviewInput) {
  if (input.startDate && input.endDate) {
    return parseStandaloneIsoDates(input.startDate, input.endDate);
  }
  const parts = input.period.split("~").map((s) => s.trim());
  if (parts.length >= 2) {
    return parseStandaloneIsoDates(parts[0]!, parts[1]!);
  }
  return { start: null, end: null };
}

export function standaloneContractToPdfVars(
  input: StandaloneContractPreviewInput,
  draftId: string,
): OohContractPdfVars {
  const isKo = input.locale !== "en";
  const { start, end } = resolveStandaloneDates(input);
  const mediaCount =
    input.mediaCount?.trim() ||
    formatContractMediaCount(input.mediaLines.length || 1);
  const countNum = parseInt(mediaCount, 10) || input.mediaLines.length || 1;
  const campaign =
    input.campaignName?.trim() ||
    (input.mediaLines[0] ? `${input.mediaLines[0]} 광고` : "옥외광고");

  const mediaSupply = supplyWonFromManwonField(input.totalAmountManwon);
  const money = buildContractMoney({
    mediaSupplyWon: mediaSupply,
    extraProductionWon: input.extraProductionWon,
    extraInstallWon: input.extraInstallWon,
    extraOtherWon: input.extraOtherWon,
  });
  const names = input.mediaLines.map((m) => m.trim()).filter(Boolean);
  const perLine =
    names.length > 0 ? Math.round(mediaSupply / names.length) : mediaSupply;
  const vars = buildKoOohContractPdfVars({
    contractId: draftId,
    isKo,
    clientCompany: input.clientCompany?.trim() || input.clientName.trim(),
    clientRepName: input.clientRepName?.trim() || input.clientName.trim(),
    clientAddress: input.clientAddress?.trim() ?? "",
    clientPhone: input.clientPhone?.trim() ?? "",
    campaignName: campaign,
    startDate: start,
    endDate: end,
    totalWonVatIncluded: money.totalWon,
    productionCost: input.productionCost?.trim() || defaultProductionCostKo(),
    mediaCount: countNum,
    paymentMethod:
      input.paymentMethod?.trim() || defaultContractPaymentMethodKo(),
    clientName: input.clientName.trim(),
    mediaLines: names,
    periodLabel: input.period.trim(),
    specialTerms: input.specialTerms?.trim() || null,
  });
  vars.mediaLineItems = names.map((name) => ({
    name,
    spec: "",
    unitPriceWon: perLine,
    lineSupplyWon: perLine,
  }));
  vars.costLines = [
    { label: "제작비", amountWon: money.extraProductionWon },
    { label: "설치비", amountWon: money.extraInstallWon },
    { label: "기타 비용", amountWon: money.extraOtherWon },
  ];
  return vars;
}
