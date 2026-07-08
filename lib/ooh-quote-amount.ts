/** OoHQuote.totalAmount is stored in 만원 (10,000 KRW units). */

export const OOH_QUOTE_WON_PER_MANWON = 10_000;

/** 만원 → 원(KRW) */
export function oohQuoteManwonToWon(manwon: number): number {
  return manwon * OOH_QUOTE_WON_PER_MANWON;
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
