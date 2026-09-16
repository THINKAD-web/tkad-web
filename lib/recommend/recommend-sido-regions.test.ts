import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRecommendRegionCodes,
  recommendRegionCodesToPlannerIds,
  recommendRegionLabel,
} from "@/lib/recommend/recommend-sido-regions";

test("normalizeRecommendRegionCodes: legacy macro to sido", () => {
  assert.deepEqual(normalizeRecommendRegionCodes(["seoul", "capital"]), [
    "11",
    "28",
    "41",
  ]);
});

test("recommendRegionCodesToPlannerIds: daegu sido", () => {
  assert.deepEqual(recommendRegionCodesToPlannerIds(["27"]), ["daegu"]);
});

test("recommendRegionLabel: sido code", () => {
  assert.equal(recommendRegionLabel("27", true), "대구");
});
