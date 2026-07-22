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
assert.equal(gray.fill, "#94a3b8", "unknown fill (light)");

const basicLight = pinColorForVisibilityScore(50, true);
assert.equal(basicLight.fill, "#FFEDD5", "tier1 cream on light tiles");

const basicDark = pinColorForVisibilityScore(50, false);
assert.equal(basicDark.fill, "#9A3412", "tier1 muted on dark tiles");
assert.notEqual(basicDark.fill, "#FFEDD5", "dark must not use cream");

const top = pinColorForVisibilityScore(98);
assert.equal(top.fill, "#ff6200", "top fill");

const topDark = pinColorForVisibilityScore(98, false);
assert.equal(topDark.fill, "#ff6200", "top fill dark");

console.log("test-map-pin-visibility-tiers: ok");
