import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";
import {
  computeContractPeriodMonthsLabel,
  defaultContractPaymentMethodKo,
  defaultProductionCostKo,
  formatContractAmountKorean,
  formatContractDateKo,
  formatContractMediaCount,
  formatContractPeriodDateKo,
  formatContractTotalAmountVatIncluded,
  parseContractPeriodRange,
  parseIsoDateOnly,
} from "@/lib/ooh-contract-format";
import { oohQuoteManwonToWon } from "@/lib/ooh-quote-amount";
import type { OohContractMeta } from "@/lib/ooh-contract-meta";

export type BuildKoContractPdfVarsInput = {
  contractId: string;
  isKo?: boolean;
  clientCompany: string;
  clientRepName: string;
  clientAddress: string;
  clientPhone: string;
  campaignName: string;
  startDate: Date | null;
  endDate: Date | null;
  /** VAT 포함 원 단위 */
  totalWonVatIncluded: number;
  productionCost?: string;
  mediaCount?: number;
  paymentMethod?: string;
  contractDate?: Date;
  /** EN fallback */
  clientName?: string;
  mediaLines?: string[];
  periodLabel?: string;
  specialTerms?: string | null;
  /** ex-VAT 만원 (EN amount line) */
  totalAmountManwon?: number;
};

export function buildKoOohContractPdfVars(
  input: BuildKoContractPdfVarsInput,
): OohContractPdfVars {
  const isKo = input.isKo !== false;
  const start = input.startDate ?? new Date();
  const end = input.endDate ?? start;
  const totalWon = Math.max(0, Math.round(input.totalWonVatIncluded));
  const company = input.clientCompany.trim() || input.clientName?.trim() || "—";
  const contact = input.clientName?.trim();

  return {
    isKo,
    contractId: input.contractId,
    clientCompany: company,
    clientRepName: input.clientRepName.trim() || contact || "—",
    clientAddress: input.clientAddress.trim() || "—",
    clientPhone: input.clientPhone.trim() || "—",
    campaignName: input.campaignName.trim() || "옥외광고",
    periodStart: formatContractPeriodDateKo(start),
    periodEnd: formatContractPeriodDateKo(end),
    periodMonths: computeContractPeriodMonthsLabel(start, end),
    productionCost: input.productionCost?.trim() || defaultProductionCostKo(),
    mediaCount: formatContractMediaCount(input.mediaCount ?? 1),
    totalAmount: formatContractTotalAmountVatIncluded(totalWon),
    amountKorean: formatContractAmountKorean(totalWon),
    paymentMethod:
      input.paymentMethod?.trim() || defaultContractPaymentMethodKo(),
    contractDate: formatContractDateKo(input.contractDate ?? new Date()),
    advertiserLine: contact
      ? company !== contact
        ? isKo
          ? `${company} (${contact})`
          : `${company} — ${contact}`
        : company
      : company,
    mediaLines: input.mediaLines ?? [],
    period:
      input.periodLabel?.trim() ||
      `${formatContractPeriodDateKo(start)} - ${formatContractPeriodDateKo(end)}`,
    amountLine: input.totalAmountManwon
      ? isKo
        ? `총 광고 집행 금액(참고, 부가세 별도, 만원): ₩${input.totalAmountManwon.toLocaleString("ko-KR")}`
        : `Total media fee (excl. VAT, 10K KRW units): ₩${input.totalAmountManwon.toLocaleString("en-US")}`
      : formatContractTotalAmountVatIncluded(totalWon),
    specialTerms: input.specialTerms ?? null,
  };
}

export function contractMetaWithDefaults(
  meta: OohContractMeta,
  fallback: Partial<OohContractMeta> = {},
): OohContractMeta {
  return {
    clientRepName: meta.clientRepName ?? fallback.clientRepName,
    clientAddress: meta.clientAddress ?? fallback.clientAddress,
    campaignName: meta.campaignName ?? fallback.campaignName,
    productionCost: meta.productionCost ?? fallback.productionCost,
    mediaCount: meta.mediaCount ?? fallback.mediaCount,
    paymentMethod: meta.paymentMethod ?? fallback.paymentMethod,
  };
}

export function resolveContractDatesFromQuote(row: {
  startDate: Date | null;
  endDate: Date | null;
  period: string;
}): { start: Date | null; end: Date | null } {
  if (row.startDate && row.endDate) {
    return { start: row.startDate, end: row.endDate };
  }
  const parsed = parseContractPeriodRange(row.period);
  return { start: parsed.start ?? row.startDate, end: parsed.end ?? row.endDate };
}

export function vatIncludedWonFromManwon(manwon: number): number {
  return Math.round(oohQuoteManwonToWon(manwon) * 1.1);
}

export function parseStandaloneIsoDates(
  startIso: string,
  endIso: string,
): { start: Date | null; end: Date | null } {
  return {
    start: parseIsoDateOnly(startIso),
    end: parseIsoDateOnly(endIso),
  };
}
