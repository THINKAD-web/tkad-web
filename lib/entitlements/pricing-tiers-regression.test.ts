/**
 * Phase 5 — LITE/AGENCY gate + isPro regression matrix (no DB).
 * Run: npx tsx --test lib/entitlements/pricing-tiers-regression.test.ts
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FEATURE_MIN_LEVEL,
  isFeatureAllowedAtLevel,
  rankLevel,
  type EntitlementAccessLevel,
} from "@/lib/entitlements";
import {
  isPro,
  isLiteOrAbove,
  teamSeatLimitForPlan,
  userPlanToAccessLevel,
} from "@/lib/plan-check-shared";
import { amountKrwForCheckoutPlan } from "@/lib/subscription-billing-client";
import {
  AGENCY_MONTHLY_KRW,
  AGENCY_TEAM_SEATS,
  LITE_MONTHLY_KRW,
  PRO_MONTHLY_KRW,
} from "@/lib/entitlements/constants";

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

describe("LEVEL_RANK ordering", () => {
  test("FREE < MEMBER < LITE < PRO < ENTERPRISE", () => {
    assert.ok(rankLevel("FREE") < rankLevel("MEMBER"));
    assert.ok(rankLevel("MEMBER") < rankLevel("LITE"));
    assert.ok(rankLevel("LITE") < rankLevel("PRO"));
    assert.ok(rankLevel("PRO") < rankLevel("ENTERPRISE"));
  });
});

describe("FEATURE_MIN_LEVEL — LITE vs PRO split", () => {
  test("planner_result and planner_pdf require LITE", () => {
    assert.equal(FEATURE_MIN_LEVEL.planner_result, "LITE");
    assert.equal(FEATURE_MIN_LEVEL.planner_pdf, "LITE");
  });

  test("simulation / competitor / market stay PRO", () => {
    assert.equal(FEATURE_MIN_LEVEL.simulation_full, "PRO");
    assert.equal(FEATURE_MIN_LEVEL.competitor, "PRO");
    assert.equal(FEATURE_MIN_LEVEL.market_dashboard, "PRO");
    assert.equal(FEATURE_MIN_LEVEL.detail_data, "PRO");
  });

  test("LITE level allows planner but not simulation", () => {
    const lite: EntitlementAccessLevel = "LITE";
    assert.equal(isFeatureAllowedAtLevel("planner_result", lite), true);
    assert.equal(isFeatureAllowedAtLevel("planner_pdf", lite), true);
    assert.equal(isFeatureAllowedAtLevel("simulation_full", lite), false);
    assert.equal(isFeatureAllowedAtLevel("competitor", lite), false);
    assert.equal(isFeatureAllowedAtLevel("market_dashboard", lite), false);
  });

  test("MEMBER (FREE signed-in) still blocked from planner_result/pdf", () => {
    assert.equal(isFeatureAllowedAtLevel("planner_result", "MEMBER"), false);
    assert.equal(isFeatureAllowedAtLevel("planner_pdf", "MEMBER"), false);
    assert.equal(isFeatureAllowedAtLevel("simulation_full", "MEMBER"), false);
  });

  test("PRO allows all non-enterprise features", () => {
    assert.equal(isFeatureAllowedAtLevel("planner_result", "PRO"), true);
    assert.equal(isFeatureAllowedAtLevel("simulation_full", "PRO"), true);
    assert.equal(isFeatureAllowedAtLevel("api", "PRO"), false);
  });
});

describe("isPro regression — existing tiers unchanged", () => {
  test("FREE is not pro", () => {
    assert.equal(isPro({ plan: "FREE" }), false);
    assert.equal(isLiteOrAbove({ plan: "FREE" }), false);
  });

  test("valid PRO_TRIAL is pro", () => {
    assert.equal(
      isPro({ plan: "PRO_TRIAL", trialEndsAt: FUTURE }),
      true,
    );
  });

  test("expired PRO_TRIAL is not pro", () => {
    assert.equal(
      isPro({ plan: "PRO_TRIAL", trialEndsAt: PAST }),
      false,
    );
  });

  test("PRO and ENTERPRISE are pro", () => {
    assert.equal(isPro({ plan: "PRO" }), true);
    assert.equal(isPro({ plan: "ENTERPRISE" }), true);
  });

  test("LITE is NOT pro (no cart/AI pro limits) but is lite+", () => {
    assert.equal(isPro({ plan: "LITE" }), false);
    assert.equal(isLiteOrAbove({ plan: "LITE" }), true);
  });

  test("AGENCY is pro (same feature tier as PRO)", () => {
    assert.equal(isPro({ plan: "AGENCY" }), true);
    assert.equal(userPlanToAccessLevel({ plan: "AGENCY" }), "PRO");
  });
});

describe("team seats", () => {
  test("non-agency plans are 1 seat", () => {
    assert.equal(teamSeatLimitForPlan("FREE"), 1);
    assert.equal(teamSeatLimitForPlan("LITE"), 1);
    assert.equal(teamSeatLimitForPlan("PRO"), 1);
    assert.equal(teamSeatLimitForPlan("PRO_TRIAL"), 1);
  });

  test("AGENCY default seats", () => {
    assert.equal(AGENCY_TEAM_SEATS, 5);
    assert.equal(teamSeatLimitForPlan("AGENCY"), 5);
  });
});

describe("checkout amounts", () => {
  test("fixed list prices", () => {
    assert.equal(LITE_MONTHLY_KRW, 39_000);
    assert.equal(PRO_MONTHLY_KRW, 99_000);
    assert.equal(AGENCY_MONTHLY_KRW, 290_000);
    assert.equal(amountKrwForCheckoutPlan("LITE"), 39_000);
    assert.equal(amountKrwForCheckoutPlan("AGENCY"), 290_000);
  });
});
