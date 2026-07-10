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

/** OoHQuote.budgetMin / budgetMax — totalAmount 와 동일하게 만원 단위 저장 */
export const OOH_QUOTE_BUDGET_INT32_MAX = 2_147_483_647;

/**
 * 월 예산 상한(만원)으로 저장하기 어려울 정도로 큰 값 — 레거시 클라이언트가 원(KRW)을 그대로 보낸 경우.
 * 1,000,000만 = 1,000억 원/월 수준.
 */
export const OOH_QUOTE_BUDGET_WON_INPUT_THRESHOLD = 1_000_000;

/** API·DB 저장용 — 원 입력은 만원으로 변환, Int32 초과는 clamp */
export function normalizeQuoteBudgetInputToManwon(
  raw: number | undefined | null,
): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  const n = Math.round(raw);
  if (n <= 0) return null;

  let manwon = n;
  if (n > OOH_QUOTE_BUDGET_WON_INPUT_THRESHOLD || n > OOH_QUOTE_BUDGET_INT32_MAX) {
    manwon = wonToManwon(n);
  }

  if (manwon <= 0) return null;
  return Math.min(manwon, OOH_QUOTE_BUDGET_INT32_MAX);
}

/** preview/PDF — budget 필드에 원이 그대로 저장된 legacy row 보정 */
export function coerceOohQuoteBudgetManwonForDisplay(
  stored: number | null | undefined,
  referenceMonthlyWon?: number | null,
): { manwon: number | null; corrected: boolean } {
  if (stored == null || !Number.isFinite(stored)) {
    return { manwon: null, corrected: false };
  }
  if (
    referenceMonthlyWon != null &&
    referenceMonthlyWon > 0 &&
    isLikelyWonStoredAsManwon(stored, referenceMonthlyWon)
  ) {
    return {
      manwon: Math.max(1, wonToManwon(stored)),
      corrected: true,
    };
  }
  if (stored > OOH_QUOTE_BUDGET_WON_INPUT_THRESHOLD) {
    return { manwon: Math.max(1, wonToManwon(stored)), corrected: true };
  }
  return { manwon: stored, corrected: false };
}

/** budgetMin/Max(만원) → 고객-facing ₩ */
export function formatOohQuoteBudgetKrw(
  budgetManwon: number,
  locale: string = "ko-KR",
): string {
  return formatOohQuoteTotalKrw(budgetManwon, locale);
}
