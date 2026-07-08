/** OoHQuote.totalAmount is stored in 만원 (10,000 KRW units). */

export const OOH_QUOTE_WON_PER_MANWON = 10_000;

/** 원(KRW) → OoHQuote.totalAmount (만원, 반올림) */
export function wonToManwon(won: number): number {
  return Math.round(won / OOH_QUOTE_WON_PER_MANWON);
}

/** 만원 → 원(KRW) */
export function oohQuoteManwonToWon(manwon: number): number {
  return manwon * OOH_QUOTE_WON_PER_MANWON;
}

/**
 * totalAmount(만원 필드)에 원(KRW) 합계가 그대로 저장된 row 감지.
 * referenceTotalWon: 매체 합계 또는 quoteBreakdown.totalWon (원).
 */
export function isLikelyWonStoredAsManwon(
  totalAmountStored: number,
  referenceTotalWon: number,
): boolean {
  if (!Number.isFinite(totalAmountStored) || totalAmountStored <= 0) return false;
  if (!Number.isFinite(referenceTotalWon) || referenceTotalWon <= 0) return false;

  const expectedManwon = Math.max(1, wonToManwon(referenceTotalWon));

  if (Math.abs(totalAmountStored - referenceTotalWon) / referenceTotalWon < 0.05) {
    return true;
  }

  const ratio = totalAmountStored / expectedManwon;
  return ratio >= 5000;
}

/** 표시·마이그레이션용 — 원 단위 오저장이면 만원으로 보정 */
export function coerceOohQuoteTotalAmountManwon(
  totalAmountStored: number,
  referenceTotalWon?: number | null,
): { manwon: number; corrected: boolean; reason?: string } {
  const stored = totalAmountStored;
  if (
    referenceTotalWon != null &&
    referenceTotalWon > 0 &&
    isLikelyWonStoredAsManwon(stored, referenceTotalWon)
  ) {
    return {
      manwon: Math.max(1, wonToManwon(stored)),
      corrected: true,
      reason: "won_stored_as_manwon",
    };
  }
  return { manwon: stored, corrected: false };
}

/** 고객-facing ₩ 표시 (원 단위) */
export function formatOohQuoteTotalKrw(
  totalAmountManwon: number,
  locale: string = "ko-KR",
): string {
  return `₩${new Intl.NumberFormat(locale).format(
    oohQuoteManwonToWon(totalAmountManwon),
  )}`;
}

/** 어드민·내부용 만원 라벨 (예: 4,080만) */
export function formatOohQuoteManwonShort(
  totalAmountManwon: number,
  locale: string = "ko-KR",
): string {
  const loc = locale.startsWith("ko") ? "ko-KR" : "en-US";
  return `₩${new Intl.NumberFormat(loc).format(totalAmountManwon)}만`;
}
