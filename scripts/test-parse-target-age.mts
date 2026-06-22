/**
 * Unit tests for targetAge parsing + planner age matching.
 * Run: npx tsx scripts/test-parse-target-age.mts
 */
import assert from "node:assert/strict";
import {
  parseTargetAge,
  scoreTargetAgeForPlanner,
  targetAgeMatchesPlannerAgeKeys,
} from "../lib/planner/parse-target-age.ts";

const r1 = parseTargetAge("20~40대 (강남 상권 특성)");
assert.equal(r1.kind, "range");
if (r1.kind === "range") {
  assert.equal(r1.minDecade, 20);
  assert.equal(r1.maxDecade, 40);
}

assert.equal(parseTargetAge("전 연령 (비즈니스맨)").kind, "all");
assert.equal(
  parseTargetAge("20~30대 중심 (관광객)").kind,
  "range",
);

assert.equal(
  targetAgeMatchesPlannerAgeKeys("20~40대", ["age20s"]),
  true,
);
assert.equal(
  targetAgeMatchesPlannerAgeKeys("20~40대", ["age50plus"]),
  false,
);
assert.equal(
  targetAgeMatchesPlannerAgeKeys("20~40대", ["age20s", "age30s"]),
  true,
);
assert.equal(
  targetAgeMatchesPlannerAgeKeys("알 수 없는 문구", ["age20s"]),
  true,
);

const neutral = scoreTargetAgeForPlanner("알 수 없는 문구", ["age20s"]);
assert.equal(neutral.points, 10);

const hit = scoreTargetAgeForPlanner("20~40대", ["age20s"]);
assert.equal(hit.points, 15);

const miss = scoreTargetAgeForPlanner("20~30대", ["age50plus"]);
assert.equal(miss.points, 5);

const noKeys = scoreTargetAgeForPlanner("20~30대", []);
assert.equal(noKeys.points, 10);

console.log("test-parse-target-age: all assertions passed");
