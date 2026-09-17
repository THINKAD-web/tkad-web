import assert from "node:assert/strict";
import test from "node:test";
import { computeAdminQuoteTotals } from "@/lib/admin-quote-calc";
import {
  applyPackageDiscount,
  type PackageDiscountRuleDTO,
} from "@/lib/pricing/package-discount";
import {
  isManualDiscountInputDisabled,
  shouldSkipAutoPackageDiscount,
} from "@/lib/pricing/package-discount-ui-policy";
import { calculateQuote } from "@/lib/quote-calculator";
import type { QuoteCalculatorMedia } from "@/lib/pricing/strategy-types";

const AS_OF = new Date("2026-06-15T12:00:00.000Z");

function rule(
  partial: Partial<PackageDiscountRuleDTO> & Pick<PackageDiscountRuleDTO, "id">,
): PackageDiscountRuleDTO {
  return {
    active: true,
    priority: 100,
    labelKo: partial.id,
    minMediaCount: null,
    maxMediaCount: null,
    minSupplyWon: null,
    maxSupplyWon: null,
    discountPercent: 10,
    stackable: false,
    validFrom: null,
    validTo: null,
    ...partial,
  };
}

test("applyPackageDiscount — 규칙 없으면 할인 0%", () => {
  const r = applyPackageDiscount(
    { lineSupplyWons: [5_000_000, 3_000_000], asOf: AS_OF },
    [],
  );
  assert.equal(r.linesSubtotalWon, 8_000_000);
  assert.equal(r.mediaCount, 2);
  assert.equal(r.packageDiscountPercent, 0);
  assert.equal(r.packageDiscountWon, 0);
  assert.equal(r.supplyAfterPackageWon, 8_000_000);
  assert.equal(r.matchedRule, null);
});

test("applyPackageDiscount — priority 오름차순 첫 매칭", () => {
  const rules = [
    rule({ id: "b", priority: 50, discountPercent: 5, minMediaCount: 2 }),
    rule({ id: "a", priority: 10, discountPercent: 15, minMediaCount: 2 }),
    rule({ id: "c", priority: 10, discountPercent: 20, minMediaCount: 2 }),
  ];
  const r = applyPackageDiscount(
    { lineSupplyWons: [1_000_000, 1_000_000], asOf: AS_OF },
    rules,
  );
  assert.equal(r.matchedRule?.id, "a");
  assert.equal(r.packageDiscountPercent, 15);
  assert.equal(r.packageDiscountWon, 300_000);
});

test("applyPackageDiscount — 동일 priority id lexicographic tie-break", () => {
  const rules = [
    rule({ id: "z-last", priority: 10, discountPercent: 7 }),
    rule({ id: "a-first", priority: 10, discountPercent: 12 }),
  ];
  const r = applyPackageDiscount({ lineSupplyWons: [10_000_000], asOf: AS_OF }, rules);
  assert.equal(r.matchedRule?.id, "a-first");
  assert.equal(r.packageDiscountPercent, 12);
});

test("applyPackageDiscount — 구간 겹침 시 더 낮은 priority만 적용", () => {
  const rules = [
    rule({
      id: "wide",
      priority: 20,
      discountPercent: 8,
      minSupplyWon: 1_000_000,
      maxSupplyWon: 20_000_000,
    }),
    rule({
      id: "narrow",
      priority: 5,
      discountPercent: 11,
      minSupplyWon: 5_000_000,
      maxSupplyWon: 10_000_000,
    }),
  ];
  const r = applyPackageDiscount(
    { lineSupplyWons: [3_000_000, 3_000_000], asOf: AS_OF },
    rules,
  );
  assert.equal(r.matchedRule?.id, "narrow");
  assert.equal(r.packageDiscountWon, 660_000);
});

test("applyPackageDiscount — 유효기간·active 필터", () => {
  const rules = [
    rule({
      id: "expired",
      priority: 1,
      validTo: new Date("2026-01-01T00:00:00.000Z"),
    }),
    rule({
      id: "inactive",
      priority: 2,
      active: false,
    }),
    rule({ id: "ok", priority: 3, discountPercent: 9 }),
  ];
  const r = applyPackageDiscount({ lineSupplyWons: [1_000_000], asOf: AS_OF }, rules);
  assert.equal(r.matchedRule?.id, "ok");
});

test("applyPackageDiscount — forced manual_override", () => {
  const rules = [rule({ id: "auto", priority: 1, discountPercent: 50 })];
  const r = applyPackageDiscount(
    {
      lineSupplyWons: [2_000_000],
      asOf: AS_OF,
      forced: {
        discountPercent: 7,
        ruleId: "auto",
        source: "manual_override",
      },
    },
    rules,
  );
  assert.equal(r.packageDiscountPercent, 7);
  assert.equal(r.packageDiscountWon, 140_000);
  assert.equal(r.matchedRule?.labelKo, "auto");
});

test("shouldSkipAutoPackageDiscount — 수동 할인 있으면 auto skip", () => {
  assert.equal(
    shouldSkipAutoPackageDiscount({
      packageDiscountSource: "none",
      manualDiscountPercent: 5,
      manualDiscountWon: 0,
    }),
    true,
  );
  assert.equal(
    shouldSkipAutoPackageDiscount({
      packageDiscountSource: "auto",
      manualDiscountPercent: 0,
      manualDiscountWon: 0,
    }),
    false,
  );
});

test("isManualDiscountInputDisabled — auto 적용 시 수동 비활성", () => {
  assert.equal(
    isManualDiscountInputDisabled({
      packageDiscountSource: "auto",
      hasAppliedAutoPackageDiscount: true,
    }),
    true,
  );
});

test("computeAdminQuoteTotals — 패키지 auto 단독 (수동 %와 상호 배타)", () => {
  const rules = [rule({ id: "p10", priority: 1, discountPercent: 10, minMediaCount: 2 })];
  const totals = computeAdminQuoteTotals({
    lineWons: [5_000_000, 5_000_000],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
    packageDiscount: { rules, asOf: AS_OF, packageDiscountSource: "auto" },
  });
  assert.equal(totals.linesSubtotalWon, 10_000_000);
  assert.equal(totals.packageDiscount?.packageDiscountWon, 1_000_000);
  assert.equal(totals.afterDiscountWon, 9_000_000);
  assert.equal(totals.supplyWon, 9_000_000);
});

test("computeAdminQuoteTotals — 수동 % 있으면 패키지 auto 미적용", () => {
  const rules = [rule({ id: "p10", priority: 1, discountPercent: 10, minMediaCount: 2 })];
  const totals = computeAdminQuoteTotals({
    lineWons: [5_000_000, 5_000_000],
    discountPercent: 5,
    discountWon: 0,
    vatIncluded: false,
    packageDiscount: { rules, asOf: AS_OF, packageDiscountSource: "auto" },
  });
  assert.equal(totals.packageDiscount, undefined);
  assert.equal(totals.afterDiscountWon, 9_500_000);
});

test("computeAdminQuoteTotals — 수동 %만 있으면 auto skip (legacy 회귀)", () => {
  const rules = [rule({ id: "p10", priority: 1, discountPercent: 10 })];
  const legacy = computeAdminQuoteTotals({
    lineWons: [5_000_000, 5_000_000],
    discountPercent: 5,
    discountWon: 0,
    vatIncluded: false,
  });
  const withEmptyRulesPath = computeAdminQuoteTotals({
    lineWons: [5_000_000, 5_000_000],
    discountPercent: 5,
    discountWon: 0,
    vatIncluded: false,
    packageDiscount: {
      rules,
      asOf: AS_OF,
      packageDiscountSource: "none",
    },
  });
  assert.deepEqual(withEmptyRulesPath, legacy);
});

const fixedMedia: QuoteCalculatorMedia = {
  id: "ooh-fixed-1",
  name: "고정기간 매체",
  location: "서울",
  type: "dooh",
  catalogChannel: "offline",
  price: 15_000_000,
  pricePeriod: "month",
  priceOptions: [
    {
      label: "1개월",
      price: 15_000_000,
      period: "month",
    },
  ],
};

test("calculateQuote — 규칙 없을 때 package 필드만 추가·금액 동일", () => {
  const start = new Date("2025-06-01T12:00:00");
  const end = new Date("2025-06-30T12:00:00");
  const base = calculateQuote({
    media: [fixedMedia],
    startDate: start,
    endDate: end,
    discountRate: 10,
  });
  const withExplicitEmpty = calculateQuote({
    media: [fixedMedia],
    startDate: start,
    endDate: end,
    discountRate: 10,
    packageDiscountRules: [],
    packageDiscountSource: "none",
  });
  assert.equal(withExplicitEmpty.totalWon, base.totalWon);
  assert.equal(withExplicitEmpty.supplyWon, base.supplyWon);
  assert.equal(withExplicitEmpty.discountWon, base.discountWon);
  assert.equal(withExplicitEmpty.packageDiscountWon, 0);
});

test("calculateQuote — 패키지 auto + 수동 없음", () => {
  const start = new Date("2025-06-01T12:00:00");
  const end = new Date("2025-06-30T12:00:00");
  const rules = [
    rule({
      id: "mix-2",
      priority: 10,
      discountPercent: 10,
      minMediaCount: 2,
    }),
  ];
  const media2 = { ...fixedMedia, id: "ooh-fixed-2" };
  const r = calculateQuote({
    media: [fixedMedia, media2],
    startDate: start,
    endDate: end,
    packageDiscountRules: rules,
    packageDiscountSource: "auto",
  });
  assert.ok(r.packageDiscountWon! > 0);
  assert.equal(r.packageDiscountPercent, 10);
  assert.ok(r.totalWon < r.subtotalWon * 1.1);
});
