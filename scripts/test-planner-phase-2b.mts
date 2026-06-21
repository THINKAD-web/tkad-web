/**
 * Phase 2-b smoke: seoul zones filter, follow-up report lines, scenario presets.
 * Usage: npx tsx scripts/test-planner-phase-2b.mts
 */
import assert from "node:assert/strict";
import type { MediaItem } from "../lib/media-data";
import { filterPlannerMediaMulti } from "../lib/planner-logic";
import { recommendPlannerMedia } from "../lib/planner/recommend";
import {
  buildReportStrategyLines,
  buildReportWhyLine,
} from "../lib/planner/report-strategy";
import { getScenarioPreset } from "../lib/planner/scenario-presets";
import { mediaMatchesSeoulZones } from "../lib/planner/seoul-zones";

function m(
  partial: Pick<MediaItem, "id" | "name" | "region" | "price" | "dailyFootTraffic"> &
    Partial<MediaItem>,
): MediaItem {
  return {
    id: partial.id,
    name: partial.name,
    nameEn: partial.name,
    location: partial.location ?? partial.name,
    locationEn: partial.location ?? partial.name,
    region: partial.region,
    type: partial.type ?? "digital",
    price: partial.price,
    dailyFootTraffic: partial.dailyFootTraffic,
    visibilityScore: 4,
    targetCategory: ["brand"],
    mediaCategory: ["dooh"],
    ...partial,
  };
}

const CATALOG: MediaItem[] = [
  m({
    id: "gn",
    name: "강남 테헤란 타워",
    region: "seoul",
    location: "서울 강남구 테헤란로",
    price: 200,
    dailyFootTraffic: 300_000,
  }),
  m({
    id: "hd",
    name: "홍대 입구 스크린",
    region: "seoul",
    location: "서울 마포구 홍대",
    price: 180,
    dailyFootTraffic: 250_000,
  }),
  m({
    id: "bs",
    name: "부산 해운대",
    region: "busan",
    location: "부산 해운대",
    price: 150,
    dailyFootTraffic: 200_000,
  }),
];

const categories = new Set(["digital", "static", "mobile"] as const);
const seoulOnly = new Set(["seoul"]);

const allSeoul = filterPlannerMediaMulti(CATALOG, seoulOnly, categories, []);
assert.equal(allSeoul.length, 2, "empty zones = all seoul media");

const gangnamOnly = filterPlannerMediaMulti(CATALOG, seoulOnly, categories, [
  "gangnam",
]);
assert.equal(gangnamOnly.length, 1);
assert.equal(gangnamOnly[0]?.id, "gn");

assert.equal(mediaMatchesSeoulZones(CATALOG[1]!, ["gangnam"]), false);

const launchPreset = getScenarioPreset("launchBeauty");
assert(launchPreset);
const launchTop = recommendPlannerMedia(
  CATALOG,
  {
    goal: launchPreset.goal,
    regions: launchPreset.regions,
    seoulZones: launchPreset.seoulZones,
    categories: launchPreset.categories,
    ageKey: "age20s",
    industryKey: launchPreset.industryKey,
    budgetMan: 300,
    months: 1,
    goalFollowUp: launchPreset.followUp,
  },
  3,
).map((s) => s.media.id);
console.log("Launch preset top:", launchTop.join(", "));

const linesA = buildReportStrategyLines({
  isKo: true,
  campaignGoal: "launch",
  goalTitle: "신제품 런칭",
  industryKey: "indRetail",
  industryText: "리테일",
  regionsText: "서울",
  seoulZones: ["gangnam", "seongsu"],
  followUp: { launchFocusWeeks: 4 },
  portfolioCount: 3,
});
const linesB = buildReportStrategyLines({
  isKo: true,
  campaignGoal: "sales",
  goalTitle: "실적·전환",
  industryKey: "indRetail",
  industryText: "리테일",
  regionsText: "서울",
  seoulZones: [],
  followUp: { conversionChannel: "online" },
  portfolioCount: 3,
});
assert(linesA.join("|") !== linesB.join("|"), "report lines differ by context");
console.log("Report A:", linesA[0]?.slice(0, 40));
console.log("Report B:", linesB[0]?.slice(0, 40));

const why = buildReportWhyLine({
  isKo: true,
  campaignGoal: "brand",
  goalTitle: "브랜드",
  industryKey: "indTech",
  industryText: "테크",
  regionsText: "서울",
  seoulZones: ["yeouido"],
  followUp: {},
  portfolioCount: 2,
});
assert(why.includes("여의도") || why.includes("Yeouido") || why.includes("2"));

console.log("\nAll Phase 2-b checks passed.");
