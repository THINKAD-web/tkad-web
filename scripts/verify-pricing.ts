/**
 * 수동 검증 스크립트 — `npx tsx scripts/verify-pricing.ts`.
 *
 * `lib/pricing` 모듈의 핵심 식이 의도대로 작동하는지 한 번에 확인한다. 정식 테스트 러너
 * (vitest 등) 도입 전까지 회귀 검증용으로 사용. 실패 시 process exit code 1.
 */

import {
  priceToWon,
  priceToDailyKrw,
  selectDiscount,
  inclusiveCampaignDays,
  computeQuoteTotals,
  VAT_RATE,
} from "@/lib/pricing";
import type { MediaItem } from "@/lib/media-data";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(
      `  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function section(title: string, fn: () => void): void {
  console.log(`\n[${title}]`);
  fn();
}

section("priceToWon", () => {
  check("auto: 30,000,000 → 30,000,000 원 (>=1M)", priceToWon(30_000_000), 30_000_000);
  check("auto: 250 → 2,500,000 원 (만원 환산)", priceToWon(250), 2_500_000);
  check("auto: 999_999 → 9,999,990,000 원 (만원 환산)", priceToWon(999_999), 9_999_990_000);
  check("won hint: 250 → 250 원", priceToWon(250, "won"), 250);
  check("man hint: 250 → 2,500,000 원", priceToWon(250, "man"), 2_500_000);
  check("음수 → 0", priceToWon(-100), 0);
  check("NaN → 0", priceToWon(Number.NaN), 0);
});

section("priceToDailyKrw", () => {
  // 30,000,000 원/월 → 1,000,000 원/일
  check("월 단가 → /30", priceToDailyKrw(30_000_000, "month"), 1_000_000);
  check("주 단가 → /7", priceToDailyKrw(7_000_000, "week"), 1_000_000);
  check("2주 단가 → /14", priceToDailyKrw(14_000_000, "biweekly"), 1_000_000);
  check("일 단가 → 그대로", priceToDailyKrw(1_000_000, "day"), 1_000_000);
  check("period 누락 → month 폴백", priceToDailyKrw(30_000_000, undefined), 1_000_000);
  check("잘못된 period → month 폴백", priceToDailyKrw(30_000_000, "weird"), 1_000_000);
});

section("selectDiscount (greater-of)", () => {
  check("0일/0매체", selectDiscount({ days: 0, mediaCount: 0 }).rate, 0);
  check("29일/4매체", selectDiscount({ days: 29, mediaCount: 4 }).rate, 0);
  check("30일/4매체 → 5%", selectDiscount({ days: 30, mediaCount: 4 }).rate, 0.05);
  check("30일/5매체 → 5% (5%>3%)", selectDiscount({ days: 30, mediaCount: 5 }).rate, 0.05);
  check("29일/5매체 → 3%", selectDiscount({ days: 29, mediaCount: 5 }).rate, 0.03);
  check("90일/2매체 → 10%", selectDiscount({ days: 90, mediaCount: 2 }).rate, 0.1);
  check("180일/10매체 → 15% (15%>3%)", selectDiscount({ days: 180, mediaCount: 10 }).rate, 0.15);
  check("reason: 30일/2매체", selectDiscount({ days: 30, mediaCount: 2 }).reason, "duration");
  check("reason: 7일/5매체", selectDiscount({ days: 7, mediaCount: 5 }).reason, "multi_media");
});

section("inclusiveCampaignDays", () => {
  check("같은 날 → 1일", inclusiveCampaignDays(new Date("2026-05-01"), new Date("2026-05-01")), 1);
  check("5월 1~7일 → 7일", inclusiveCampaignDays(new Date("2026-05-01"), new Date("2026-05-07")), 7);
  check("5월 1~31일 → 31일", inclusiveCampaignDays(new Date("2026-05-01"), new Date("2026-05-31")), 31);
  check("5월 1일 ~ 6월 1일 → 32일", inclusiveCampaignDays(new Date("2026-05-01"), new Date("2026-06-01")), 32);
  check("종료 < 시작 → 0", inclusiveCampaignDays(new Date("2026-05-10"), new Date("2026-05-01")), 0);
});

section("computeQuoteTotals — end-to-end", () => {
  // Mock media: 월 30,000,000 원(원 단위 명시) + 일 단가 = 1,000,000 원
  const baseMedia: MediaItem = {
    id: "m1",
    name: "Mock A",
    nameEn: "Mock A",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: 30_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 100_000,
    sampleImages: [],
  };

  // 30일 캠페인, 매체 1개 → 라인 30M, 할인 5%, VAT 10%
  // subtotal=30M, discounted=28.5M, vat=2.85M, total=31.35M
  const r1 = computeQuoteTotals({
    lines: [{ media: baseMedia }],
    start: new Date("2026-05-01"),
    end: new Date("2026-05-30"),
    hint: "won",
  });
  check("days = 30", r1.days, 30);
  check("subtotal = 30,000,000", r1.subtotalKrw, 30_000_000);
  check("discount rate = 5%", r1.discount.rate, 0.05);
  check("discounted = 28,500,000", r1.discountedKrw, 28_500_000);
  check("vat = 2,850,000", r1.vatKrw, 2_850_000);
  check("total = 31,350,000", r1.totalKrw, 31_350_000);
  check("perDay = 1,045,000", r1.perDayKrw, 1_045_000);

  // 7일 캠페인, 매체 1개 → 할인 없음
  const r2 = computeQuoteTotals({
    lines: [{ media: baseMedia }],
    start: new Date("2026-05-01"),
    end: new Date("2026-05-07"),
    hint: "won",
  });
  check("7일 days = 7", r2.days, 7);
  check("7일 lineKrw = 7,000,000", r2.lines[0].lineKrw, 7_000_000);
  check("7일 discount = 0", r2.discount.rate, 0);
  check(
    "7일 total = 7,000,000 × 1.1",
    r2.totalKrw,
    Math.round(7_000_000 * (1 + VAT_RATE)),
  );

  // 매체 5개 / 7일 → 다중 할인 3%만 적용
  const r3 = computeQuoteTotals({
    lines: Array.from({ length: 5 }, () => ({ media: baseMedia })),
    start: new Date("2026-05-01"),
    end: new Date("2026-05-07"),
    hint: "won",
  });
  check("5매체 7일 discount = 3%", r3.discount.rate, 0.03);
  check("5매체 7일 reason", r3.discount.reason, "multi_media");

  // 일 단가 매체 → period가 day 인 경우
  const dailyMedia: MediaItem = {
    ...baseMedia,
    id: "m_day",
    price: 400_000,
    pricePeriod: "day",
  };
  const r4 = computeQuoteTotals({
    lines: [{ media: dailyMedia }],
    start: new Date("2026-05-01"),
    end: new Date("2026-05-10"),
    hint: "won",
  });
  check("일 단가 10일 lineKrw = 4,000,000", r4.lines[0].lineKrw, 4_000_000);
});

if (failures > 0) {
  console.error(`\n[FAIL] ${failures} 항목 불일치.`);
  process.exit(1);
}
console.log("\n[OK] 모든 가격 식 검증 통과.");
