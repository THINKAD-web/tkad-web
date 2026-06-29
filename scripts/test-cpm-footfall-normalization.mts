/**
 * CPM ×10000 fix + network footfall aggregation tests.
 * Run: npx tsx scripts/test-cpm-footfall-normalization.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
  resolveDisplayCpmWon,
} from "../lib/ai-recommend-metrics.ts";
import {
  computeNetworkDailyFootfall,
  NETWORK_DAILY_FOOTFALL_FLOOR,
} from "../lib/media-network-public.ts";
import { plannerBlendCpmKrw } from "../lib/planner-logic.ts";

// --- A. CPM: 원 단위 price, not ×10000 ---
const helloLike: MediaItem = {
  id: "test-hello",
  name: "헬로미디어형",
  location: "서울",
  type: "digital",
  price: 10_000_000,
  dailyFootTraffic: 150_000,
} as MediaItem;

const cpm = estimatedCpmWon(helloLike);
assert.ok(cpm != null, "CPM should be computed");
assert.ok(cpm! < 100_000, `CPM should be sane KRW, got ${cpm}`);
assert.equal(
  Math.round(cpm!),
  Math.round(
    10_000_000 / (estimatedMonthlyImpressions(helloLike) / 1000),
  ),
  "CPM matches priceWon / (imp/1000)",
);

const blended = plannerBlendCpmKrw(
  [helloLike],
  estimatedMonthlyImpressions(helloLike),
);
assert.equal(Math.round(cpm!), blended, "AI card CPM aligns with planner blend");

const oldBugCpm = (10_000_000 * 10_000) / (4_500_000 / 1000);
assert.ok(cpm! < oldBugCpm / 100, "fixed CPM far below old ×10000 bug");

// --- C. Stored CPM outlier → resolveDisplayCpmWon ---
const badStored: MediaItem = {
  id: "bad-stored",
  name: "노량진형",
  location: "서울",
  type: "billboard",
  price: 9_700_000,
  impressions: 2_990_000,
  cpm: 2.7,
} as MediaItem;

const fixed = resolveDisplayCpmWon(badStored);
assert.ok(fixed != null && fixed > 1000, `outlier stored should recalc, got ${fixed}`);
assert.equal(Math.round(fixed!), 3244, "stored 2.7 → ~3244");

const goodStored: MediaItem = {
  id: "good-stored",
  name: "광화문 KT형",
  location: "서울",
  type: "digital",
  price: 72_000_000,
  impressions: 3_000_000,
  cpm: 24_000,
} as MediaItem;

const kept = resolveDisplayCpmWon(goodStored);
assert.equal(kept, 24_000, "in-range stored CPM preserved");

const noImp: MediaItem = {
  id: "no-imp",
  name: "Empty",
  location: "서울",
  type: "digital",
  price: 1_000_000,
  cpm: 12,
} as MediaItem;
assert.equal(resolveDisplayCpmWon(noImp), null, "no impressions → dash, not stored");

// --- B. Network footfall: sum not average ---
const campusPartial = computeNetworkDailyFootfall({
  dailyFootfall: null,
  totalLocations: 16,
  locations: Array.from({ length: 16 }, () => ({
    dailyFootfall: 4825,
    unitCount: 1,
  })),
});
assert.equal(campusPartial, 77_200, "16 sites × 4825 = sum, not average");

const campusLike = computeNetworkDailyFootfall({
  dailyFootfall: null,
  totalLocations: 103,
  locations: Array.from({ length: 16 }, () => ({
    dailyFootfall: 4825,
    unitCount: 1,
  })),
});
assert.ok(
  campusLike >= 77_000,
  `campus-like should sum locations, got ${campusLike}`,
);
assert.ok(
  campusLike > 10_000,
  "campus should not stay at per-location average 4825",
);

// DB explicit + modest location sum → max
const dbPreferred = computeNetworkDailyFootfall({
  dailyFootfall: 320_000,
  totalLocations: 150,
  locations: [{ dailyFootfall: 50_000, unitCount: 150 }],
});
assert.equal(dbPreferred, 320_000, "DB wins when location sum is 5×+ inflated");

// DB + reasonable location sum (no unit scale-up) → max(db, locSum)
const maxWins = computeNetworkDailyFootfall({
  dailyFootfall: 50_000,
  totalLocations: 2,
  locations: [
    { dailyFootfall: 8_000, unitCount: 1 },
    { dailyFootfall: 7_000, unitCount: 1 },
  ],
});
assert.equal(maxWins, 50_000, "max(db, locSum) when loc not 5× over db");

assert.ok(
  campusLike > campusPartial,
  "scaling to 103 units exceeds raw 16-site sum",
);

// Zero data → floor
const empty = computeNetworkDailyFootfall({
  dailyFootfall: null,
  totalLocations: 0,
  locations: [],
});
assert.equal(empty, NETWORK_DAILY_FOOTFALL_FLOOR, "empty footfall uses floor");

// Cap
const huge = computeNetworkDailyFootfall({
  dailyFootfall: null,
  totalLocations: 1000,
  locations: [{ dailyFootfall: 100_000, unitCount: 1000 }],
});
assert.ok(huge <= 5_000_000, `capped at 5M, got ${huge}`);

console.log("test-cpm-footfall-normalization.mts: all passed");
