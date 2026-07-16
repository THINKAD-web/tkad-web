import assert from "node:assert/strict";
import test from "node:test";
import {
  briefApplyHasParsedGoal,
  buildFreetextBriefApply,
  resolvePlannerWizardStepAfterBriefApply,
} from "@/lib/planner/freetext-brief-apply";

test("resolvePlannerWizardStepAfterBriefApply: goal parsed → step 2", () => {
  const payload = buildFreetextBriefApply("강남 2030 브랜딩 3000만원", true);
  assert.ok(payload);
  assert.equal(resolvePlannerWizardStepAfterBriefApply(payload.parseResult), 2);
  assert.equal(briefApplyHasParsedGoal(payload.parseResult), true);
  assert.equal(payload.patch.campaignGoal, "brand");
});

test("resolvePlannerWizardStepAfterBriefApply: no goal → step 1", () => {
  const payload = buildFreetextBriefApply("강남에서 광고 하고 싶어요", true);
  assert.ok(payload);
  assert.equal(resolvePlannerWizardStepAfterBriefApply(payload.parseResult), 1);
  assert.equal(briefApplyHasParsedGoal(payload.parseResult), false);
});
