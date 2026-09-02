/** Admin 견적 — price≤0(표시단가) 라인의 「별도 문의」 표기 */

export function adminQuoteOnInquiryLabel(isKo: boolean): string {
  return isKo ? "별도 문의" : "On request";
}

/** 단가·소계가 모두 ≤0이면 문의 항목 (override 있으면 소계>0 → 금액 표시) */
export function isAdminQuoteLineOnInquiry(
  unitPriceWon: number,
  lineTotalWon: number,
): boolean {
  return (
    !(Number.isFinite(unitPriceWon) && unitPriceWon > 0) &&
    !(Number.isFinite(lineTotalWon) && lineTotalWon > 0)
  );
}

/**
 * 견적 라인 단가/소계 셀.
 * - `priceOnInquiry: true` → 「별도 문의」
 * - unit+line 둘 다 주어지고 둘 다 ≤0 → 「별도 문의」
 * - 그 외 formatWon(cellWon)
 */
export function formatAdminQuoteLineCell(
  cellWon: number,
  isKo: boolean,
  formatWon: (n: number, isKo: boolean) => string,
  opts?: {
    priceOnInquiry?: boolean;
    unitPriceWon?: number;
    lineTotalWon?: number;
    inquiryLabel?: string;
  },
): string {
  if (opts?.priceOnInquiry === true) {
    return opts.inquiryLabel ?? adminQuoteOnInquiryLabel(isKo);
  }
  if (
    opts?.unitPriceWon != null &&
    opts?.lineTotalWon != null &&
    isAdminQuoteLineOnInquiry(opts.unitPriceWon, opts.lineTotalWon)
  ) {
    return opts.inquiryLabel ?? adminQuoteOnInquiryLabel(isKo);
  }
  return formatWon(cellWon, isKo);
}

export function countAdminQuoteInquiryLines(
  items: Array<{ priceOnInquiry?: boolean; unitPrice: number; amount: number }>,
): number {
  return items.filter(
    (it) =>
      it.priceOnInquiry === true ||
      isAdminQuoteLineOnInquiry(it.unitPrice, it.amount),
  ).length;
}
