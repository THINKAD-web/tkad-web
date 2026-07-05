/**
 * Unit tests for visibility score pin tier bucketing.
 * Run: npx tsx scripts/test-map-pin-visibility-tiers.mts
 */
import assert from "node:assert/strict";
import {
  pinColorForVisibilityScore,
  visibilityPinTierDefForScore,
  visibilityPinTierForScore,
} from "../lib/map-pin-visibility-colors.ts";

function expectTier(score: number, tier: number, labelKo: string) {
  assert.equal(visibilityPinTierForScore(score), tier, `score ${score} tier`);
  assert.equal(
    visibilityPinTierDefForScore(score).labelKo,
    labelKo,
    `score ${score} label`,
  );
}

expectTier(0, 0, "미입력");
expectTier(-5, 0, "미입력");
expectTier(1, 1, "기본");
expectTier(84, 1, "기본");
expectTier(85, 2, "표준");
expectTier(88, 2, "표준");
expectTier(89, 3, "양호");
expectTier(91, 3, "양호");
expectTier(92, 4, "높음");
expectTier(94, 4, "높음");
expectTier(95, 5, "최상");
expectTier(100, 5, "최상");

const gray = pinColorForVisibilityScore(0);
assert.equal(gray.fill, "#94a3b8", "unknown fill");

const top = pinColorForVisibilityScore(98);
assert.equal(top.fill, "#00E5FF", "top fill");

console.log("test-map-pin-visibility-tiers: ok");
