import assert from "node:assert/strict";
import test from "node:test";

import type { MediaItem } from "@/lib/media-data";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";
import {
  buildPlannerOverBudgetAppendixSpecs,
  resolveOverBudgetChoice,
} from "@/lib/planner/brief/over-budget-options";
import { rebuildBriefRecommendedMix } from "@/lib/planner/brief/rebuild-mix";

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-1",
    name: "픽스처 DOOH",
    nameEn: "Fixture DOOH",
    location: "서울 강남",
    locationEn: "Gangnam, Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    subCategory: "led_screen",
    price: 10_000_000,
    pricePeriod: "month",
    dailyFootTraffic: 300_000,
    coveragePopulation: 552_631,
    ...over,
  } as MediaItem;
}

test("resolveOverBudgetChoice: 예산 내 mix 이면 null", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 50_000_000,
    budgetMode: "total" as const,
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  };
  const cheap = fixtureMedia({ id: "cheap", price: 5_000_000 });
  const choice = resolveOverBudgetChoice({
    brief,
    catalog: [cheap],
    mixUnits: { cheap: 1 },
    isKo: true,
  });
  assert.equal(choice, null);
});

test("resolveOverBudgetChoice: Option A 는 예산 내, Option B 는 원 mix 유지", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 20_000_000,
    budgetMode: "total" as const,
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  };
  const a = fixtureMedia({
    id: "a",
    name: "A 매체",
    price: 8_000_000,
    district: "강남구",
  });
  const b = fixtureMedia({
    id: "b",
    name: "B 매체",
    price: 15_000_000,
    district: "서초구",
    type: "static",
    subCategory: "billboard",
  });
  const catalog = [a, b];
  const mixUnits = { a: 1, b: 1 };

  const choice = resolveOverBudgetChoice({
    brief,
    catalog,
    mixUnits,
    isKo: true,
  });
  assert.ok(choice);
  assert.ok(choice.optionB.overBudgetWon > 0);
  assert.equal(choice.optionB.overBudgetWon > 0, true);
  assert.equal(choice.optionB.mediaCount, 2);
  assert.deepEqual(Object.keys(choice.optionB.mixUnits).sort(), ["a", "b"]);
  assert.equal(choice.optionA.overBudgetWon, 0);
  assert.ok(choice.optionA.totalCostWon <= choice.budgetWon);

  const expectedA = rebuildBriefRecommendedMix({
    brief,
    catalog,
    isKo: true,
    preserveMixUnits: mixUnits,
  });
  assert.deepEqual(
    choice.optionA.mixLines.map((l) => l.mediaId).sort(),
    expectedA.map((l) => l.mediaId).sort(),
  );
});

test("Option B 는 mixUnits 를 변경하지 않는다 (요약만)", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 12_000_000,
    budgetMode: "total" as const,
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  };
  const pricey = fixtureMedia({ id: "p", price: 18_000_000 });
  const mixUnits = { p: 1 };
  const choice = resolveOverBudgetChoice({
    brief,
    catalog: [pricey],
    mixUnits,
    isKo: true,
  });
  assert.ok(choice);
  assert.deepEqual(choice.optionB.mixUnits, mixUnits);
});

test("buildPlannerOverBudgetAppendixSpecs: 초과 mix 에서 제외 매체 부록", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 15_000_000,
    budgetMode: "total" as const,
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
  };
  const a = fixtureMedia({ id: "a", price: 6_000_000, district: "강남구" });
  const b = fixtureMedia({
    id: "b",
    price: 12_000_000,
    district: "서초구",
    type: "static",
  });
  const mixUnits = { a: 1, b: 1 };
  const specs = buildPlannerOverBudgetAppendixSpecs({
    brief,
    catalog: [a, b],
    mixUnits,
    isKo: true,
  });
  assert.ok(specs && specs.length >= 1);
  assert.ok(specs.every((s) => s.inBody));
  assert.ok(
    specs.some((s) => s.statusNote.includes("예산") || s.statusNote.includes("제외")),
  );
});
