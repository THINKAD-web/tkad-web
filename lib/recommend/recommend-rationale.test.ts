import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { MatchingInput, ScoreBreakdown } from "@/lib/matching-engine";
import {
  formatRecommendRationale,
  formatRequestedRegionsText,
  rationaleKeysFromBreakdown,
  rationaleSummaryLine,
} from "@/lib/recommend/recommend-rationale";

function media(partial: Partial<MediaItem> & Pick<MediaItem, "id" | "name">): MediaItem {
  return {
    nameEn: partial.name,
    location: "",
    locationEn: "",
    region: "busan",
    type: "mobile",
    price: 0,
    ...partial,
  } as MediaItem;
}

const busanCentumInput: MatchingInput = {
  monthlyBudgetWon: 5_000_000,
  regions: ["busan", "centum"],
  industry: "entertainment",
  targets: ["mass"],
  durationMonths: 1,
  durationDays: 11,
  goal: "event",
  categories: ["mobile"],
};

const gangnamTaxiInput: MatchingInput = {
  monthlyBudgetWon: 8_000_000,
  regions: ["gangnam"],
  industry: "other",
  targets: ["biz"],
  durationMonths: 1,
  goal: "brand",
  categories: ["mobile"],
};

test("formatRequestedRegionsText: busan + centum", () => {
  const text = formatRequestedRegionsText(
    busanCentumInput,
    { busanZones: ["centum"] },
    true,
  );
  assert.match(text ?? "", /부산/);
  assert.match(text ?? "", /센텀/);
});

test("UNESCO-style brief: region + short duration + mobile", () => {
  const m = media({
    id: "t1",
    name: "부산 택시 래핑 A",
    location: "해운대·센텀권",
    type: "mobile",
    mediaMainCategory: "mobile",
  });
  const breakdown: ScoreBreakdown = {
    budget: 28,
    region: 25,
    industry: 12,
    target: 10,
    category: 14,
    popularity: 7,
    total: 86,
  };
  const lines = formatRecommendRationale(
    busanCentumInput,
    m,
    breakdown,
    "ko",
    { busanZones: ["centum"], plannerCategories: ["mobile"], budgetMaxMan: 500 },
  );
  assert.ok(lines.length >= 2);
  const joined = lines.map((l) => l.ko).join(" ");
  assert.match(joined, /부산|센텀/);
  assert.match(joined, /11일|단기/);
  assert.match(joined, /이동형|택시/);
});

test("Gangnam taxi branding: region + mobile", () => {
  const m = media({
    id: "t2",
    name: "강남 택시 래핑",
    location: "강남·역삼",
    type: "mobile",
    mediaMainCategory: "mobile",
  });
  const breakdown: ScoreBreakdown = {
    budget: 26,
    region: 25,
    industry: 8,
    target: 14,
    category: 15,
    popularity: 6,
    total: 84,
  };
  const lines = formatRecommendRationale(gangnamTaxiInput, m, breakdown, "ko", {
    plannerCategories: ["mobile"],
    locationKeywords: ["강남"],
    budgetMaxMan: 800,
  });
  const joined = lines.map((l) => l.ko).join(" ");
  assert.match(joined, /강남/);
  assert.match(joined, /이동형|택시/);
});

test("generic brief fallback when breakdown is weak", () => {
  const m = media({
    id: "t3",
    name: "전국 디지털 네트워크",
    location: "전국",
    type: "dooh",
    mediaMainCategory: "digital",
  });
  const breakdown: ScoreBreakdown = {
    budget: 5,
    region: 8,
    industry: 5,
    target: 5,
    category: 5,
    popularity: 3,
    total: 31,
  };
  const lines = formatRecommendRationale(
    {
      monthlyBudgetWon: 0,
      regions: [],
      industry: "other",
      targets: ["mass"],
      durationMonths: 1,
      goal: "awareness",
    },
    m,
    breakdown,
    "ko",
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0]!.ko, /부분 일치/);
});

test("rationaleKeysFromBreakdown aligns with chip thresholds", () => {
  const keys = rationaleKeysFromBreakdown({
    budget: 22,
    region: 20,
    industry: 11,
    target: 13,
    category: 13,
    popularity: 6,
  });
  assert.deepEqual(keys, [
    "budgetEfficient",
    "matchRegion",
    "industryFit",
  ]);
});

test("rationaleSummaryLine returns first localized line", () => {
  const lines = formatRecommendRationale(
    gangnamTaxiInput,
    media({ id: "x", name: "강남 택시", location: "강남", type: "mobile" }),
    {
      budget: 25,
      region: 25,
      industry: 10,
      target: 12,
      category: 14,
      popularity: 5,
      total: 80,
    },
    "ko",
    { plannerCategories: ["mobile"] },
  );
  assert.equal(rationaleSummaryLine(lines, "ko"), lines[0]?.ko);
});
