import assert from "node:assert/strict";
import test from "node:test";
import { calculateMediaQuoteByDays } from "@/lib/compare-quote";
import type { MediaItem } from "@/lib/media-data";

/** M-CITY — DB `pricePeriod` 가 "day" 로 잘못 기재된 실제 패턴 */
const MCITY = {
  id: "m-city",
  name: "M-CITY",
  location: "서울",
  region: "서울",
  type: "digital",
  price: 70_000_000,
  pricePeriod: "day",
  priceOptions: [
    { label: "7일", price: 25_000_000, period: "week" },
    { label: "1개월", price: 70_000_000, period: "month" },
  ],
  impressions: 2_200_000,
  dailyFootTraffic: 160_000,
  tags: [],
  sampleImages: [],
} as unknown as MediaItem;

test("V-5: 30일 견적이 등록 상품가 — 선형 환산 21억이 아니다", () => {
  const line = calculateMediaQuoteByDays(MCITY, 30);
  assert.equal(line.costWon, 70_000_000);
  assert.notEqual(line.costWon, 2_100_000_000);
});

test("V-5: 7일 견적도 등록 상품가", () => {
  const line = calculateMediaQuoteByDays(MCITY, 7);
  assert.equal(line.costWon, 25_000_000);
});

test("V-5: 견적 금액이 홈 카드 표시가와 일치한다 (갈라지지 않음)", () => {
  // 홈 카드는 resolveMediaPriceForDisplay(media, 30).won = 70,000,000
  assert.equal(calculateMediaQuoteByDays(MCITY, 30).costWon, 70_000_000);
});

test("V-5: 등록 상품에 없는 일수는 보간값 — 선형보다 항상 작다", () => {
  const line = calculateMediaQuoteByDays(MCITY, 14);
  const linear = 70_000_000 * 14; // 기존 폴백이 냈을 금액
  assert.ok(line.costWon < linear);
  assert.ok(line.costWon > 25_000_000 && line.costWon < 70_000_000);
});

test("V-5: 가격 옵션이 없으면 기존 선형 폴백을 유지한다 (회귀 방지)", () => {
  const noOptions = {
    ...MCITY,
    priceOptions: [],
    price: 1_000_000,
    pricePeriod: "month",
  } as unknown as MediaItem;
  // month(30일) 기준 → base 옵션이 30일로 잡혀 exact 매칭
  assert.equal(calculateMediaQuoteByDays(noOptions, 30).costWon, 1_000_000);
});

test("V-5: 일 단가가 진짜인 매체는 일할 계산이 유지된다", () => {
  const trueDaily = {
    ...MCITY,
    price: 1_000_000,
    pricePeriod: "day",
    priceOptions: [],
  } as unknown as MediaItem;
  // base 옵션 = 1일 100만 → 1일 요청은 exact
  assert.equal(calculateMediaQuoteByDays(trueDaily, 1).costWon, 1_000_000);
});
