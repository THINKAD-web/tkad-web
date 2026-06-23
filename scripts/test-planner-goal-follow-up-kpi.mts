/**
 * Planner goal follow-up: conversionKpi must preserve spaces while typing.
 * Run: npx tsx scripts/test-planner-goal-follow-up-kpi.mts
 */
import assert from "node:assert/strict";
import {
  formatConversionKpiForReport,
  normalizeFollowUpForGoal,
} from "../lib/planner/goal-follow-up.ts";

const partial = normalizeFollowUpForGoal("sales", {
  conversionChannel: "both",
  conversionKpi: "글로벌 ",
});
assert.equal(
  partial.conversionKpi,
  "글로벌 ",
  "trailing space preserved during input",
);

const complete = normalizeFollowUpForGoal("sales", {
  conversionChannel: "both",
  conversionKpi: "글로벌 여행객으로 효과적인",
});
assert.equal(
  complete.conversionKpi,
  "글로벌 여행객으로 효과적인",
  "internal spaces preserved",
);

const notePartial = normalizeFollowUpForGoal("brand", {
  goalReferenceNote: "글로벌 ",
});
assert.equal(
  notePartial.goalReferenceNote,
  "글로벌 ",
  "goalReferenceNote trailing space preserved",
);

const noteComplete = normalizeFollowUpForGoal("brand", {
  goalReferenceNote: "글로벌 여행객으로 효과적인",
});
assert.equal(
  noteComplete.goalReferenceNote,
  "글로벌 여행객으로 효과적인",
  "goalReferenceNote internal spaces preserved",
);

assert.equal(
  formatConversionKpiForReport("  방문 목표  ", true),
  "방문 목표",
  "report export trims edges only",
);

assert.equal(
  normalizeFollowUpForGoal("sales", { conversionKpi: "" }).conversionKpi,
  null,
  "empty string normalizes to null",
);

console.log("test-planner-goal-follow-up-kpi: ok");
