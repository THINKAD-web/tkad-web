/**
 * Integration: planner ageKeys affect ranking via targetAge (mock catalog).
 * Run: npx tsx scripts/test-planner-age-matching.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data.ts";
import { matchMediaCatalog } from "../lib/matching-engine.ts";
import { recommendPlannerMedia } from "../lib/planner/recommend.ts";
import { targetAgeMatchesPlannerAgeKeys } from "../lib/planner/parse-target-age.ts";

function mockMedia(
  id: string,
  targetAge: string,
  price = 3_000_000,
): MediaItem {
  return {
    id,
    name: `Mock ${id}`,
    location: "서울 강남구",
    type: "digital",
    price,
    dailyFootTraffic: 50_000,
    targetAge,
  } as MediaItem;
}

const catalog = [
  mockMedia("old-only", "50~60대 (시니어)", 2_000_000),
  mockMedia("young", "20~30대 (MZ)", 4_000_000),
  mockMedia("wide", "20~50대 (전 연령층)", 3_500_000),
  mockMedia("unknown", "강남 직장인 상권", 3_000_000),
  mockMedia("mid", "30~40대", 3_200_000),
];

const base = {
  goal: "brand" as const,
  regions: [] as string[],
  categories: [] as const,
  industryKey: null,
  budgetMan: 500,
  months: 1,
};

const matched = matchMediaCatalog(
  catalog,
  {
    monthlyBudgetWon: 5_000_000,
    regions: [],
    industry: "other",
    targets: [],
    plannerAgeKeys: ["age20s"],
    durationMonths: 1,
    goal: "brand",
  },
  10,
);

const youngRow = matched.find((m) => m.media.id === "young");
const oldRow = matched.find((m) => m.media.id === "old-only");
assert.ok(youngRow && oldRow, "both media scored");
assert.ok(
  youngRow.breakdown.target > oldRow.breakdown.target,
  `young target ${youngRow.breakdown.target} > old ${oldRow.breakdown.target}`,
);

const noAge = matchMediaCatalog(
  catalog,
  {
    monthlyBudgetWon: 5_000_000,
    regions: [],
    industry: "other",
    targets: ["mass"],
    durationMonths: 1,
    goal: "brand",
  },
  10,
);
const withAge = matchMediaCatalog(
  catalog,
  {
    monthlyBudgetWon: 5_000_000,
    regions: [],
    industry: "other",
    targets: [],
    plannerAgeKeys: ["age20s", "age30s"],
    durationMonths: 1,
    goal: "brand",
  },
  10,
);
assert.notEqual(
  noAge.find((m) => m.media.id === "young")?.breakdown.target,
  withAge.find((m) => m.media.id === "young")?.breakdown.target,
);

const all = recommendPlannerMedia(catalog, { ...base, ageKeys: [] }, 5, 0);
const a20 = recommendPlannerMedia(catalog, { ...base, ageKeys: ["age20s"] }, 5, 0);
assert.notEqual(
  all.map((x) => x.media.id).join(),
  a20.map((x) => x.media.id).join(),
);

const top20Match = a20.filter((x) =>
  targetAgeMatchesPlannerAgeKeys(x.media.targetAge, ["age20s"]),
).length;
assert.ok(top20Match >= 3);

console.log("test-planner-age-matching: ok");
