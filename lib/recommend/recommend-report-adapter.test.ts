import assert from "node:assert/strict";
import { test } from "node:test";
import type { Industry } from "@/lib/ai-media-recommend";
import { recommendIndustryToPlannerIndustryKey } from "@/lib/recommend/recommend-report-adapter";

/** AI recommend form industries → planner 6-chip keys (indBeauty deferred). */
const EXPECTED: Record<Industry, string> = {
  beauty: "indRetail",
  retail: "indRetail",
  fmcg: "indRetail",
  fintech: "indFinance",
  auto: "indOther",
  entertainment: "indEnt",
  other: "indOther",
};

test("recommendIndustryToPlannerIndustryKey: full AI form mapping", () => {
  for (const [industry, expected] of Object.entries(EXPECTED) as [
    Industry,
    string,
  ][]) {
    assert.equal(
      recommendIndustryToPlannerIndustryKey(industry),
      expected,
      industry,
    );
  }
});

test("recommendIndustryToPlannerIndustryKey: beauty aligns with freetext indRetail path", () => {
  assert.equal(recommendIndustryToPlannerIndustryKey("beauty"), "indRetail");
  assert.notEqual(recommendIndustryToPlannerIndustryKey("beauty"), "indFb");
});
