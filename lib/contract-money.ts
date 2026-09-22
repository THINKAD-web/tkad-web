import { OOH_QUOTE_WON_PER_MANWON } from "@/lib/ooh-quote-amount";

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
