/**
 * 관리자 견적서 계산 검증 (테스트 인프라 없이 tsx 로 실행).
 * 사용: `npx tsx scripts/test-admin-quote-calc.ts`
 *
 * 검증:
 *  1. VAT 별도/포함 모드의 supply / vat / total 정확성
 *  2. 할인 (퍼센트 + 정액) 적용 후 합계 일치
 *  3. 라인합 == linesSubtotalWon
 *  4. supply + vat == total (VAT 별도)
 *  5. supply + vat == afterDiscount (VAT 포함)
 */
import {
  computeAdminQuoteTotals,
  inclusiveCampaignDays,
  monthFactorFromDays,
  lineSupplyWon,
} from "../lib/admin-quote-calc";

let failed = 0;
let passed = 0;

function expect(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function testCase(name: string, fn: () => void): void {
  console.log(`\n[${name}]`);
  fn();
}

testCase("inclusiveCampaignDays", () => {
  expect(
    "동일 일자 = 1일",
    inclusiveCampaignDays(new Date("2026-04-01"), new Date("2026-04-01")) === 1,
  );
  expect(
    "30일 = 30일",
    inclusiveCampaignDays(new Date("2026-04-01"), new Date("2026-04-30")) ===
      30,
  );
  expect(
    "역순 = 0일",
    inclusiveCampaignDays(new Date("2026-04-30"), new Date("2026-04-01")) === 0,
  );
});

testCase("monthFactorFromDays", () => {
  expect("30일 = 1.0", monthFactorFromDays(30) === 1);
  expect("60일 = 2.0", monthFactorFromDays(60) === 2);
  expect("15일 = 0.5", monthFactorFromDays(15) === 0.5);
});

testCase("lineSupplyWon — 만원 단위 가격 (price < 1,000,000)", () => {
  // price=500 (만원), 1개월, 수량 1 → 5,000,000원
  const won = lineSupplyWon(500, 1, 1);
  expect("500만원 × 1 = 5,000,000원", won === 5_000_000, `got ${won}`);
  // 2개월 × 수량 3
  const won2 = lineSupplyWon(500, 2, 3);
  expect("500만원 × 2 × 3 = 30,000,000원", won2 === 30_000_000, `got ${won2}`);
});

testCase("lineSupplyWon — 원 단위 가격 (price >= 1,000,000)", () => {
  // price=5000000 (원), 1개월, 1 → 5,000,000원
  const won = lineSupplyWon(5_000_000, 1, 1);
  expect("5,000,000원 × 1 × 1 = 5,000,000원", won === 5_000_000, `got ${won}`);
});

testCase("computeAdminQuoteTotals — 할인 없음, VAT 별도", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [1_000_000, 2_000_000, 3_000_000],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });
  expect("subtotal = 6,000,000", t.linesSubtotalWon === 6_000_000);
  expect("discount = 0", t.discountTotalWon === 0);
  expect("supply = 6,000,000", t.supplyWon === 6_000_000);
  expect("vat = 600,000", t.vatWon === 600_000);
  expect("total = 6,600,000", t.totalWon === 6_600_000);
  expect("supply + vat == total", t.supplyWon + t.vatWon === t.totalWon);
});

testCase("computeAdminQuoteTotals — 할인 10%, VAT 별도", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [10_000_000],
    discountPercent: 10,
    discountWon: 0,
    vatIncluded: false,
  });
  expect("subtotal = 10,000,000", t.linesSubtotalWon === 10_000_000);
  expect("discount = 1,000,000", t.discountTotalWon === 1_000_000);
  expect("afterDiscount = 9,000,000", t.afterDiscountWon === 9_000_000);
  expect("supply = 9,000,000", t.supplyWon === 9_000_000);
  expect("vat = 900,000", t.vatWon === 900_000);
  expect("total = 9,900,000", t.totalWon === 9_900_000);
  expect("supply + vat == total", t.supplyWon + t.vatWon === t.totalWon);
});

testCase("computeAdminQuoteTotals — 할인액 정액, VAT 별도", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [10_000_000],
    discountPercent: 0,
    discountWon: 500_000,
    vatIncluded: false,
  });
  expect("subtotal = 10,000,000", t.linesSubtotalWon === 10_000_000);
  expect("discount = 500,000", t.discountTotalWon === 500_000);
  expect("supply = 9,500,000", t.supplyWon === 9_500_000);
  expect("vat = 950,000", t.vatWon === 950_000);
  expect("total = 10,450,000", t.totalWon === 10_450_000);
});

testCase("computeAdminQuoteTotals — 할인 % + 정액 동시, VAT 별도", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [10_000_000],
    discountPercent: 10,
    discountWon: 500_000,
    vatIncluded: false,
  });
  // 10% off → 9,000,000. 추가 500,000 정액 차감 → 8,500,000
  expect("supply = 8,500,000", t.supplyWon === 8_500_000);
  expect("discount = 1,500,000", t.discountTotalWon === 1_500_000);
  expect("vat = 850,000", t.vatWon === 850_000);
  expect("total = 9,350,000", t.totalWon === 9_350_000);
  expect("supply + vat == total", t.supplyWon + t.vatWon === t.totalWon);
});

testCase("computeAdminQuoteTotals — VAT 포함 모드, 할인 없음", () => {
  // 입력 라인이 VAT 포함 가격이라고 가정. 1,100,000 → 공급가 1,000,000 + VAT 100,000
  const t = computeAdminQuoteTotals({
    lineWons: [1_100_000],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: true,
  });
  expect("subtotal = 1,100,000", t.linesSubtotalWon === 1_100_000);
  expect("total = 1,100,000", t.totalWon === 1_100_000);
  expect("supply = 1,000,000", t.supplyWon === 1_000_000);
  expect("vat = 100,000", t.vatWon === 100_000);
  expect("supply + vat == total", t.supplyWon + t.vatWon === t.totalWon);
});

testCase("computeAdminQuoteTotals — VAT 포함 모드, 10% 할인", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [11_000_000],
    discountPercent: 10,
    discountWon: 0,
    vatIncluded: true,
  });
  expect("subtotal = 11,000,000", t.linesSubtotalWon === 11_000_000);
  expect(
    "afterDiscount (= total) = 9,900,000",
    t.afterDiscountWon === 9_900_000,
  );
  expect("total = 9,900,000", t.totalWon === 9_900_000);
  expect("supply = 9,000,000", t.supplyWon === 9_000_000);
  expect("vat = 900,000", t.vatWon === 900_000);
  expect("supply + vat == total", t.supplyWon + t.vatWon === t.totalWon);
});

testCase("computeAdminQuoteTotals — 음수 할인은 0으로 클램프", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [1_000_000],
    discountPercent: 0,
    discountWon: 5_000_000, // 매출 초과
    vatIncluded: false,
  });
  expect(
    "afterDiscount = 0 (음수 클램프)",
    t.afterDiscountWon === 0,
  );
  expect("total = 0", t.totalWon === 0);
  expect("vat = 0", t.vatWon === 0);
});

testCase("computeAdminQuoteTotals — 100% 할인", () => {
  const t = computeAdminQuoteTotals({
    lineWons: [1_000_000, 2_000_000],
    discountPercent: 100,
    discountWon: 0,
    vatIncluded: false,
  });
  expect("supply = 0", t.supplyWon === 0);
  expect("total = 0", t.totalWon === 0);
  expect("discount = subtotal", t.discountTotalWon === 3_000_000);
});

testCase("라인합 일관성 — 라인 합 == linesSubtotalWon", () => {
  const lines = [1_234_567, 89_012, 5_678_901, 23_456];
  const expected = lines.reduce((a, b) => a + b, 0);
  const t = computeAdminQuoteTotals({
    lineWons: lines,
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });
  expect("linesSubtotalWon == sum(lineWons)", t.linesSubtotalWon === expected);
});

testCase("회귀: 만원 round 누적 손실이 없어야 함 (사용자 보고 시나리오)", () => {
  // 4,567,890원 라인 1개. supply / vat / total 의 만원 round 가 따로 일어나면 안 됨.
  const t = computeAdminQuoteTotals({
    lineWons: [4_567_890],
    discountPercent: 0,
    discountWon: 0,
    vatIncluded: false,
  });
  // PDF preview 가 won 단위를 받아 표시 직전에만 round 하므로:
  // formatManWon(supply) = round(456789 / 10000) = round(456.789) = 457만원
  // formatManWon(vat) = round(456789 / 10000) = round(45.679) = 46만원
  // formatManWon(total) = round(5024679 / 10000) = round(502.468) = 502만원
  // 이들 사이에 supply + vat = total 의 만원 round 가 정확히 떨어지진 않을 수 있지만,
  // 실제 won 합은 정확함:
  expect(
    "공급가 + 부가세 == 총계 (원 단위)",
    t.supplyWon + t.vatWon === t.totalWon,
  );
  expect("supplyWon = 4,567,890", t.supplyWon === 4_567_890);
  expect("vatWon = 456,789", t.vatWon === 456_789);
  expect("totalWon = 5,024,679", t.totalWon === 5_024_679);
});

console.log(`\n${"=".repeat(60)}`);
console.log(`결과: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
