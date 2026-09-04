#!/usr/bin/env npx tsx
/**
 * PR5-c commit 4 — rebuildBriefRecommendedMix leak fix verification.
 * Simulates 3 autofill triggers + manual online preservation (no browser).
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import { isOnlineCatalogMedia } from "../lib/pricing-unavailable.ts";
import { EMPTY_BRIEF } from "../lib/planner/brief/types.ts";
import { rebuildBriefRecommendedMix } from "../lib/planner/brief/rebuild-mix.ts";
import { resolveOverBudgetChoice } from "../lib/planner/brief/over-budget-options.ts";

function offline(id: string, price = 8_000_000): MediaItem {
  return {
    id,
    name: id,
    nameEn: id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    type: "dooh",
    subCategory: "led_screen",
    price,
    pricePeriod: "month",
    dailyFootTraffic: 200_000,
    coveragePopulation: 400_000,
  } as MediaItem;
}

const onlineManual = {
  ...offline("online-manual", 0),
  id: "online-manual",
  catalogChannel: "online" as const,
  type: null,
  price: null,
  regionMain: "online",
  region: "online",
  onlineSpec: {
    platform: "Meta",
    minBudget: 500_000,
    cpcMin: 100,
    cpcMax: 300,
    cpmMin: 3000,
    cpmMax: 6000,
  },
} as MediaItem;

const brief = {
  ...EMPTY_BRIEF,
  budgetInputWon: 20_000_000,
  budgetMode: "total" as const,
  flightStart: "2026-08-01",
  flightEnd: "2026-08-31",
  regionCodes: ["11"] as const,
  industry: "fb" as const,
};

const catalog = [offline("ooh-a"), offline("ooh-b", 6_000_000), onlineManual];
const preserve = { "online-manual": 2, "ooh-a": 1 };

function assertNoOnlineLeak(
  label: string,
  lines: { mediaId: string; units: number }[],
) {
  for (const line of lines) {
    if (line.mediaId === "online-manual") continue;
    const row = catalog.find((m) => m.id === line.mediaId);
    assert.ok(row && !isOnlineCatalogMedia(row), `${label}: online leak ${line.mediaId}`);
  }
}

// Trigger 1 — Step 2 autofill button
const t1 = rebuildBriefRecommendedMix({ brief, catalog, preserveMixUnits: preserve });
assertNoOnlineLeak("trigger1", t1);
assert.equal(t1.find((l) => l.mediaId === "online-manual")?.units, 2);

// Trigger 2 — stale dialog rebuild
const t2 = rebuildBriefRecommendedMix({ brief, catalog, preserveMixUnits: preserve });
assertNoOnlineLeak("trigger2", t2);
assert.equal(t2.find((l) => l.mediaId === "online-manual")?.units, 2);

// Trigger 3 — over-budget Option A
const overMix = { "ooh-a": 1, "ooh-b": 1, "online-manual": 2 };
const choice = resolveOverBudgetChoice({
  brief: { ...brief, budgetInputWon: 10_000_000 },
  catalog,
  mixUnits: overMix,
  isKo: true,
});
assert.ok(choice, "expected over-budget choice");
assertNoOnlineLeak("trigger3", choice.optionA.mixLines);
assert.equal(
  choice.optionA.mixLines.find((l) => l.mediaId === "online-manual")?.units,
  2,
);

console.log(
  JSON.stringify(
    {
      pass: true,
      trigger1Slugs: t1.map((l) => l.mediaId).sort(),
      trigger2Slugs: t2.map((l) => l.mediaId).sort(),
      trigger3Slugs: choice.optionA.mixLines.map((l) => l.mediaId).sort(),
      preservedOnlineUnits: 2,
    },
    null,
    2,
  ),
);
