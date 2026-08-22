import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { computePlannerPortfolioBudgetStatus } from "@/lib/planner-logic";

function media(
  o: Partial<MediaItem> & Pick<MediaItem, "id" | "price">,
): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 1000,
    sampleImages: [],
    pricePeriod: "month",
    ...o,
  } as MediaItem;
}

test("14일·3,000만 — 요청 예산을 월 환산하지 않는다", () => {
  const portfolio = [
    media({ id: "a", price: 5_000_000 }),
    media({ id: "b", price: 5_000_000 }),
    media({ id: "c", price: 1_000_000 }),
    media({ id: "d", price: 1_000_000 }),
    media({ id: "e", price: 500_000 }),
  ];
  const months = 14 / 30;
  const status = computePlannerPortfolioBudgetStatus(portfolio, 3000, months);
  assert.equal(status.budgetMan, 3000);
  assert.ok(
    !Number.isFinite(3000 / months) ||
      Math.round(status.budgetMan) !== Math.round(3000 / months),
    "budgetMan must stay the campaign total, not monthly conversion",
  );
  assert.equal(Math.round(status.budgetMan), 3000);
  assert.equal(Math.round(status.periodTotalMan), 583);
  assert.equal(status.overBudget, false);
});

test("1개월 캠페인 — 기간 합이 월 정가 합과 같다", () => {
  const portfolio = [media({ id: "a", price: 10_000_000 })];
  const status = computePlannerPortfolioBudgetStatus(portfolio, 5000, 1);
  assert.equal(status.periodTotalMan, 1000);
  assert.equal(status.budgetMan, 5000);
});
