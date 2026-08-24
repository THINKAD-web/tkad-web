import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOnboardingWizardInitialState } from "../onboarding-wizard-state.ts";

test("startRole BROWSER skips to preview only", () => {
  const s = resolveOnboardingWizardInitialState({
    onboardingRole: "BROWSER",
    industries: [],
    budgetRange: null,
  });
  assert.equal(s.phase, "preview");
  assert.equal(s.totalSteps, 1);
  assert.equal(s.roleLocked, true);
});

test("startRole ADVERTISER starts at prefs with role locked", () => {
  const s = resolveOnboardingWizardInitialState({
    onboardingRole: "ADVERTISER",
    industries: ["tech"],
    budgetRange: "under_500",
  });
  assert.equal(s.phase, "prefs");
  assert.equal(s.totalSteps, 2);
  assert.equal(s.role, "ADVERTISER");
  assert.equal(s.roleLocked, true);
  assert.deepEqual(s.industries, ["tech"]);
});

test("no startRole shows prefs with role picker", () => {
  const s = resolveOnboardingWizardInitialState(null);
  assert.equal(s.phase, "prefs");
  assert.equal(s.roleLocked, false);
  assert.equal(s.role, null);
});
