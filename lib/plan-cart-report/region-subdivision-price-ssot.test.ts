/**
 * 이슈3 — 상권 세분화 `monthlyBudgetWon` 이 플래너·매체 라인과 같은
 * `resolveCatalogLineMonthlyPriceWon` (priceOptions 우선) SSOT 를 쓰는지 검증.
 *
 * A-1b `awareness-campaign-fixture` 는 월정가 단일가 매체만 써서
 * `m.price` vs priceOptions 불일치를 우회했다. package·grade·해외 주단가를 포함한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  plannerMediaPeriodLineWon,
  plannerMonthlyPriceWonForMedia,
} from "@/lib/planner/planner-media-quantity";
import { computeRegionSubdivisionReport } from "./region-subdivision.ts";

function media(
  o: Partial<MediaItem> & Pick<MediaItem, "id">,
): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 10_000,
    sampleImages: [],
    pricePeriod: "month",
    ...o,
  } as MediaItem;
}

const PACKAGE_PORTFOLIO: MediaItem[] = [
  media({
    id: "pkg-gangnam",
    name: "패키지 강남",
    regionSub: "seoul_gangnam",
    district: "강남구",
    price: 20_000_000,
    priceOptions: [
      { label: "1개월", price: 10_000_000, period: "month" },
    ],
  }),
  media({
    id: "pkg-seongsu",
    name: "패키지 성수",
    regionSub: "seoul_seongsu",
    district: "성동구",
    price: 12_000_000,
    priceOptions: [
      { label: "1개월", price: 10_000_000, period: "month" },
    ],
  }),
];

const GRADE_PORTFOLIO: MediaItem[] = [
  media({
    id: "bus-gangnam",
    name: "버스 강남",
    type: "버스",
    regionSub: "seoul_gangnam",
    district: "강남구",
    price: 3_000_000,
    priceOptions: [
      { label: "SSA", price: 1_500_000, period: "month" },
      { label: "A", price: 1_200_000, period: "month" },
    ],
  }),
  media({
    id: "bus-mapo",
    name: "버스 마포",
    type: "버스",
    regionSub: "seoul_hongdae",
    district: "마포구",
    price: 2_400_000,
    priceOptions: [
      { label: "SSA", price: 1_500_000, period: "month" },
      { label: "A", price: 1_200_000, period: "month" },
    ],
  }),
];

const JP_WEEKLY_PORTFOLIO: MediaItem[] = [
  media({
    id: "jp-a",
    name: "JP A",
    location: "Tokyo Shibuya",
    region: "overseas",
    country: "JP",
    district: "Shibuya Crossing",
    price: 1_718_000,
    pricePeriod: "week",
    priceOptions: [{ label: "1주", price: 260_000, period: "week" }],
  }),
  media({
    id: "jp-b",
    name: "JP B",
    location: "Tokyo Shibuya",
    region: "overseas",
    country: "JP",
    district: "Shibuya Station",
    price: 1_200_000,
    pricePeriod: "week",
    priceOptions: [{ label: "1주", price: 300_000, period: "week" }],
  }),
];

function assertSubdivisionBudgetParity(
  portfolio: MediaItem[],
  months: number,
  pricing?: {
    quantities?: Record<string, number>;
    priceOptionIndex?: Record<string, number>;
  },
) {
  const report = computeRegionSubdivisionReport(
    portfolio,
    months,
    true,
    pricing,
  );
  assert.ok(report, "상권 세분화가 생성되어야 한다");
  const rows = report!.breakdown;
  assert.ok(rows.length >= 2);

  const periodCtx = { months };
  const expectedMonthlySum = portfolio.reduce(
    (s, m) =>
      s +
      plannerMonthlyPriceWonForMedia(
        m,
        pricing?.quantities,
        pricing?.priceOptionIndex,
      ),
    0,
  );
  const expectedPeriodSum = portfolio.reduce(
    (s, m) =>
      s + plannerMediaPeriodLineWon(m, periodCtx, pricing, true),
    0,
  );

  const subMonthlySum = rows.reduce((s, r) => s + r.monthlyBudgetWon, 0);
  const subPeriodSum = rows.reduce((s, r) => s + r.periodBudgetWon, 0);

  assert.equal(
    subMonthlySum,
    expectedMonthlySum,
    "상권표 월예산 합 == plannerMonthlyPriceWonForMedia 합",
  );
  assert.equal(
    subPeriodSum,
    expectedPeriodSum,
    "상권표 기간 견적 합 == 매체 라인(기간) 합",
  );
}

test("package — 루트 m.price ≠ priceOptions 여도 상권표·라인 합 일치", () => {
  assertSubdivisionBudgetParity(PACKAGE_PORTFOLIO, 1, {
    quantities: { "pkg-gangnam": 1, "pkg-seongsu": 1 },
    priceOptionIndex: { "pkg-gangnam": 0, "pkg-seongsu": 0 },
  });
  // 레거시 루트 합(3200만)과 달라야 한다 — 이 테스트가 우회를 막는다.
  const rootSum = PACKAGE_PORTFOLIO.reduce((s, m) => s + m.price, 0);
  assert.equal(rootSum, 32_000_000);
  assert.notEqual(rootSum, 20_000_000);
});

test("grade(버스) — 등급 옵션가 기준으로 상권표·라인 합 일치", () => {
  assertSubdivisionBudgetParity(GRADE_PORTFOLIO, 1, {
    quantities: { "bus-gangnam": 1, "bus-mapo": 1 },
    priceOptionIndex: { "bus-gangnam": 0, "bus-mapo": 0 },
  });
});

test("해외 주단가 — 상권표 monthly 가 루트 price 가 아닌 옵션가", () => {
  const pricing = {
    quantities: { "jp-a": 1, "jp-b": 1 },
    priceOptionIndex: { "jp-a": 0, "jp-b": 0 },
  };
  assertSubdivisionBudgetParity(JP_WEEKLY_PORTFOLIO, 1, pricing);
  const report = computeRegionSubdivisionReport(
    JP_WEEKLY_PORTFOLIO,
    1,
    true,
    pricing,
  );
  const subMonthlySum = report!.breakdown.reduce(
    (s, r) => s + r.monthlyBudgetWon,
    0,
  );
  const rootSum = JP_WEEKLY_PORTFOLIO.reduce((s, m) => s + m.price, 0);
  assert.equal(subMonthlySum, 560_000);
  assert.notEqual(subMonthlySum, rootSum);
});
