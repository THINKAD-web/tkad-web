import assert from "node:assert/strict";
import test from "node:test";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";

/** packageDiscount 옵션 없이 호출하던 legacy 합산 (회귀 기준) */
function legacyComputeAdminQuoteTotals(opts: {
  lineWons: number[];
  discountPercent: number;
  discountWon: number;
  vatIncluded: boolean;
}) {
  const linesSubtotalWon = opts.lineWons.reduce((a, b) => a + b, 0);
  const pct = Math.min(100, Math.max(0, opts.discountPercent));
  const afterPct = linesSubtotalWon * (1 - pct / 100);
  const afterDiscountWon = Math.max(
    0,
    Math.round(afterPct - Math.max(0, opts.discountWon)),
  );
  const discountTotalWon = Math.max(0, linesSubtotalWon - afterDiscountWon);
  const VAT_RATE = 0.1;
  if (!opts.vatIncluded) {
    const supplyWon = afterDiscountWon;
    const vatWon = Math.round(supplyWon * VAT_RATE);
    return {
      linesSubtotalWon,
      discountTotalWon,
      afterDiscountWon,
      supplyWon,
      vatWon,
      totalWon: supplyWon + vatWon,
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

const SCENARIOS: Array<{
  name: string;
  lineWons: number[];
  discountPercent: number;
  discountWon: number;
  vatIncluded: boolean;
}> = [
  {
    name: "단일 라인 VAT 별도",
    lineWons: [12_345_678],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  },
  {
    name: "다중 라인 + % 할인",
    lineWons: [3_000_000, 7_000_000, 500_000],
    discountPercent: 12.5,
    discountWon: 0,
    vatIncluded: false,
  },
  {
    name: "원 할인 + VAT 포함",
    lineWons: [10_000_000],
    discountPercent: 0,
    discountWon: 250_000,
    vatIncluded: true,
  },
  {
    name: "% + 원 동시",
    lineWons: [1_111_111, 2_222_222],
    discountPercent: 3,
    discountWon: 50_000,
    vatIncluded: false,
  },
  {
    name: "빈 라인 포함",
    lineWons: [0, 5_000_000, 0],
    discountPercent: 10,
    discountWon: 0,
    vatIncluded: false,
  },
];

for (const s of SCENARIOS) {
  test(`회귀 — 규칙 없음(옵션 미전달) ${s.name}`, () => {
    const legacy = legacyComputeAdminQuoteTotals(s);
    const current = computeAdminQuoteTotals(s);
    assert.deepEqual(
      {
        linesSubtotalWon: current.linesSubtotalWon,
        discountTotalWon: current.discountTotalWon,
        afterDiscountWon: current.afterDiscountWon,
        supplyWon: current.supplyWon,
        vatWon: current.vatWon,
        totalWon: current.totalWon,
      },
      legacy,
    );
    assert.equal(current.packageDiscount, undefined);
  });

  test(`회귀 — 빈 규칙 테이블 + calculateQuote 경로 ${s.name}`, () => {
    const legacy = legacyComputeAdminQuoteTotals(s);
    const withEmptyRules = computeAdminQuoteTotals({
      ...s,
      packageDiscount: {
        rules: [],
        packageDiscountSource: "none",
      },
    });
    assert.deepEqual(
      {
        linesSubtotalWon: withEmptyRules.linesSubtotalWon,
        discountTotalWon: withEmptyRules.discountTotalWon,
        afterDiscountWon: withEmptyRules.afterDiscountWon,
        supplyWon: withEmptyRules.supplyWon,
        vatWon: withEmptyRules.vatWon,
        totalWon: withEmptyRules.totalWon,
      },
      legacy,
    );
  });
}
