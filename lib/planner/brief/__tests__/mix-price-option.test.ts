import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { calcLineMetrics } from "@/lib/planner/brief/mix-metrics";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { briefPriceOptionIndex } from "@/lib/planner/brief/brief-report-adapter";
import {
  defaultMixPriceOptionIndex,
  effectiveMixPriceOptionIndex,
  optionIdForPriceOptionIndex,
  priceOptionIndexFromOptionId,
  resolveMixLineProductPrice,
} from "@/lib/planner/brief/mix-price-option";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-po",
    name: "옵션 매체",
    nameEn: "Option media",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    price: 70_000_000,
    pricePeriod: "month",
    priceOptions: [
      { label: "7일", price: 25_000_000, period: "week" },
      { label: "1개월", price: 70_000_000, period: "month" },
    ],
    dailyFootTraffic: 100_000,
    sampleImages: [],
    ...over,
  } as MediaItem;
}

test("비행 30일이면 1개월 옵션이 기본 인덱스", () => {
  const media = fixtureMedia();
  assert.equal(defaultMixPriceOptionIndex(media, 30), 1);
});

test("사용자 선택이 있으면 그것을 유효 인덱스로 쓴다", () => {
  const media = fixtureMedia();
  assert.equal(effectiveMixPriceOptionIndex(media, 30, 0), 0);
  assert.equal(effectiveMixPriceOptionIndex(media, 30, undefined), 1);
});

test("선택 없으면 기존 비행 일수 원가와 같다", () => {
  const media = fixtureMedia();
  const auto = calcLineMetrics({ media, units: 1 }, 30);
  const explicitUnset = calcLineMetrics(
    { media, units: 1, priceOptionIndex: undefined },
    30,
  );
  assert.equal(auto.costWon?.value, explicitUnset.costWon?.value);
});

test("사용자가 7일 옵션을 고르면 그 등록가가 라인 금액이다", () => {
  const media = fixtureMedia();
  const line = calcLineMetrics({ media, units: 1, priceOptionIndex: 0 }, 30);
  assert.equal(line.costWon?.value, 25_000_000);
});

test("optionId po-N 라운드트립", () => {
  const media = fixtureMedia();
  assert.equal(optionIdForPriceOptionIndex(1), "po-1");
  assert.equal(priceOptionIndexFromOptionId(media, "po-1"), 1);
  assert.equal(priceOptionIndexFromOptionId(media, "opt:0"), 0);
  assert.equal(priceOptionIndexFromOptionId(media, "base"), undefined);
});

test("스냅샷 optionId 를 다시 읽으면 같은 인덱스", () => {
  const media = fixtureMedia();
  const snap = buildCampaignPlanSnapshot({
    brief: {
      ...EMPTY_BRIEF,
      budgetInputWon: 100_000_000,
      budgetMode: "total",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-30",
    },
    catalog: [media],
    mixUnits: { [media.id]: 1 },
    mixPriceOptionIndex: { [media.id]: 0 },
  });
  assert.equal(snap.mediaMix[0]?.optionId, "po-0");
  assert.deepEqual(briefPriceOptionIndex(snap.mediaMix, [media]), {
    [media.id]: 0,
  });
  const price = resolveMixLineProductPrice(media, 30, 0);
  assert.equal(price?.amount, 25_000_000);
});
