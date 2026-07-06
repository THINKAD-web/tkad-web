import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { plannerMediaMonthlyPriceMan } from "@/lib/matching-network-helpers";
import {
  computePlannerPortfolioBudgetStatus,
  computePlannerPortfolioMonthlyMan,
} from "@/lib/planner-logic";
import {
  plannerMonthlyImpressionsForMedia,
  plannerMonthlyPriceManForMedia,
} from "@/lib/planner/planner-media-quantity";

function networkItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "nw-1",
    name: "Network",
    nameEn: "Network",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "network",
    catalogSource: "network",
    price: 1_000_000,
    networkMinUnits: 10,
    networkPricePerUnit: 100_000,
    networkTotalLocations: 200,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 500,
    ...overrides,
  };
}

test("empty quantities matches plannerMediaMonthlyPriceMan (regression)", () => {
  const m = networkItem();
  assert.equal(plannerMonthlyPriceManForMedia(m), plannerMediaMonthlyPriceMan(m));
  assert.equal(
    plannerMonthlyPriceManForMedia(m, {}),
    plannerMediaMonthlyPriceMan(m),
  );
});

test("explicit units scale portfolio monthly man and impressions", () => {
  const m = networkItem();
  const min = 10;
  const atMin = plannerMonthlyPriceManForMedia(m, { [m.id]: min });
  const atDouble = plannerMonthlyPriceManForMedia(m, { [m.id]: min * 2 });
  assert.equal(atDouble, atMin * 2);
  assert.equal(
    plannerMonthlyImpressionsForMedia(m, { [m.id]: min * 2 }),
    plannerMonthlyImpressionsForMedia(m, { [m.id]: min }) * 2,
  );
});

test("portfolio budget status reflects quantity", () => {
  const m = networkItem({
    networkPackageTiers: undefined,
    networkPricePerUnit: 100_000,
    networkMinUnits: 10,
    networkTotalLocations: 200,
  });
  const portfolio = [m];
  const atMin = computePlannerPortfolioMonthlyMan(portfolio);
  const atMore = computePlannerPortfolioMonthlyMan(portfolio, {
    quantities: { [m.id]: 20 },
  });
  assert.ok(atMore > atMin);
  const status = computePlannerPortfolioBudgetStatus(portfolio, 5000, 3, {
    quantities: { [m.id]: 20 },
  });
  assert.equal(status.monthlyTotalMan, atMore);
});
