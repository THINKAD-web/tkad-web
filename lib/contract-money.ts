import { OOH_QUOTE_WON_PER_MANWON } from "@/lib/ooh-quote-amount";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import type { OohContractMeta } from "@/lib/ooh-contract-meta";

/**
 * OoHQuote.totalAmount 는 만원 단위가 원칙.
 * 원(KRW)이 그대로 들어간 값에 ×10,000 을 한 번 더 하면
 * ₩165,000,000,000 같은 표기가 나온다.
 *
 * 100억 원(= 1,000,000만)을 넘는 만원 저장은 실무상 없고,
 * 그 이상이면 원 단위가 필드에 들어간 것으로 본다.
 */
const MANWON_FIELD_WON_MISTAKEN_MIN = 1_000_000;

export function supplyWonFromManwonField(
  stored: number,
  referenceSupplyWon?: number | null,
): number {
  if (!Number.isFinite(stored) || stored <= 0) return 0;
  if (
    referenceSupplyWon != null &&
    referenceSupplyWon > 0 &&
    Math.abs(stored - referenceSupplyWon) / referenceSupplyWon < 0.08
  ) {
    return Math.round(referenceSupplyWon);
  }
  if (stored >= MANWON_FIELD_WON_MISTAKEN_MIN) {
    return Math.round(stored);
  }
  return Math.round(stored * OOH_QUOTE_WON_PER_MANWON);
}

export function vatFromSupplyWon(supplyWon: number): number {
  return Math.round(Math.max(0, supplyWon) * 0.1);
}

export type ContractMoneyBreakdown = {
  mediaSupplyWon: number;
  extraProductionWon: number;
  extraInstallWon: number;
  extraOtherWon: number;
  supplyWon: number;
  vatWon: number;
  totalWon: number;
};

/** 어드민 제작비 텍스트·금액 필드에서 원화 추출 */
export function parseWonFromLooseAdminInput(raw: string | undefined): number {
  const t = raw?.trim() ?? "";
  if (!t) return 0;
  const man = t.match(/([\d,.]+)\s*만(?:\s*원)?/u);
  if (man) {
    const n = Number(man[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.round(n * OOH_QUOTE_WON_PER_MANWON);
  }
  const digits = t.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1_000_000) return n;
  if (n >= 100 && n < 1_000_000 && /만/u.test(t)) {
    return Math.round(n * OOH_QUOTE_WON_PER_MANWON);
  }
  return n;
}

export function productionCostLooksLikeWonAmountOnly(raw: string | undefined): boolean {
  const t = raw?.trim() ?? "";
  if (!t) return false;
  if (/만/u.test(t)) return true;
  const digits = t.replace(/[^\d]/g, "");
  if (digits.length < 5) return false;
  return /^[\d,\s원₩￦.]+$/u.test(t);
}

function numMetaField(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** 계약 PDF·총액용 부가비용 — meta 숫자 → 제작비 텍스트 → 견적 addon 라인 */
export function resolveContractExtraWons(
  meta: OohContractMeta,
  breakdown: QuoteBreakdown | null | undefined,
): {
  extraProductionWon: number;
  extraInstallWon: number;
  extraOtherWon: number;
} {
  let extraProductionWon = numMetaField(meta.extraProductionWon);
  let extraInstallWon = numMetaField(meta.extraInstallWon);
  let extraOtherWon = numMetaField(meta.extraOtherWon);

  if (!extraProductionWon && meta.productionCost) {
    extraProductionWon = parseWonFromLooseAdminInput(meta.productionCost);
  }

  for (const line of breakdown?.lines ?? []) {
    if (!isQuoteAddonLineId(line.mediaId)) continue;
    const amt = Math.round(line.lineSupplyWon ?? 0);
    if (amt <= 0) continue;
    const name = line.mediaName;
    if (/제작|디자인|production/i.test(name)) {
      if (!extraProductionWon) extraProductionWon = amt;
      continue;
    }
    if (/설치/i.test(name)) {
      if (!extraInstallWon) extraInstallWon = amt;
      continue;
    }
    if (!extraOtherWon) extraOtherWon = amt;
  }

  return { extraProductionWon, extraInstallWon, extraOtherWon };
}

export function buildContractMoney(input: {
  mediaSupplyWon: number;
  extraProductionWon?: number;
  extraInstallWon?: number;
  extraOtherWon?: number;
}): ContractMoneyBreakdown {
  const mediaSupplyWon = Math.max(0, Math.round(input.mediaSupplyWon));
  const extraProductionWon = Math.max(0, Math.round(input.extraProductionWon ?? 0));
  const extraInstallWon = Math.max(0, Math.round(input.extraInstallWon ?? 0));
  const extraOtherWon = Math.max(0, Math.round(input.extraOtherWon ?? 0));
  const supplyWon =
    mediaSupplyWon + extraProductionWon + extraInstallWon + extraOtherWon;
  const vatWon = vatFromSupplyWon(supplyWon);
  return {
    mediaSupplyWon,
    extraProductionWon,
    extraInstallWon,
    extraOtherWon,
    supplyWon,
    vatWon,
    totalWon: supplyWon + vatWon,
  };
}
