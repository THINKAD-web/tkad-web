/** 부가세율 (한국) */
const VAT_RATE = 0.1;
const MS_PER_DAY = 86_400_000;

/** 시작·종료일(포함) 기준 캠페인 일수 */
export function inclusiveCampaignDays(start: Date, end: Date): number {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  const a = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

/** 30일 = 1개월로 환산한 계수 (소수 허용) */
export function monthFactorFromDays(days: number): number {
  if (days <= 0) return 0;
  return days / 30;
}

/**
 * 매체 DB `price`는 월 단가(만원)로 가정.
 * 공급가(원) = 만원×10,000 × 월계수 × 수량
 */
export function lineSupplyWon(
  priceManPerMonth: number,
  monthFactor: number,
  quantity: number,
): number {
  const p = Math.max(0, priceManPerMonth);
  const m = Math.max(0, monthFactor);
  const q = Math.max(0, quantity);
  // DB price는 이미 원 단위
  return Math.round(p * m * q);
}

export type AdminQuoteTotals = {
  /** 선택 라인 합계 (할인 전) */
  linesSubtotalWon: number;
  /** 할인으로 깎인 총액 (소계 − 할인 적용 후) */
  discountTotalWon: number;
  /** 할인 적용 후 금액 (부가세 별도면 공급가, 포함이면 총액) */
  afterDiscountWon: number;
  supplyWon: number;
  vatWon: number;
  totalWon: number;
};

export function computeAdminQuoteTotals(opts: {
  lineWons: number[];
  discountPercent: number;
  discountWon: number;
  vatIncluded: boolean;
}): AdminQuoteTotals {
  const linesSubtotalWon = opts.lineWons.reduce((a, b) => a + b, 0);
  const pct = Math.min(100, Math.max(0, opts.discountPercent));
  const afterPct = linesSubtotalWon * (1 - pct / 100);
  const afterDiscountWon = Math.max(
    0,
    Math.round(afterPct - Math.max(0, opts.discountWon)),
  );

  const discountTotalWon = Math.max(0, linesSubtotalWon - afterDiscountWon);

  if (!opts.vatIncluded) {
    const supplyWon = afterDiscountWon;
    const vatWon = Math.round(supplyWon * VAT_RATE);
    const totalWon = supplyWon + vatWon;
    return {
      linesSubtotalWon,
      discountTotalWon,
      afterDiscountWon,
      supplyWon,
      vatWon,
      totalWon,
    };
  }

  const totalWon = afterDiscountWon;
  const supplyWon = Math.round(totalWon / (1 + VAT_RATE));
  const vatWon = totalWon - supplyWon;
  return {
    linesSubtotalWon,
    discountTotalWon,
    afterDiscountWon,
    supplyWon,
    vatWon,
    totalWon,
  };
}
