import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDigitalMixPayload,
  mapOohGoalToDigitalGoal,
  mapOohIndustryToDigital,
  regionsToDigitalGeo,
} from "@/lib/integrated/field-adapters";

describe("field-adapters", () => {
  it("maps OOH goals to digital goals", () => {
    assert.equal(mapOohGoalToDigitalGoal("brand"), "AWARENESS");
    assert.equal(mapOohGoalToDigitalGoal("event"), "TRAFFIC");
    assert.equal(mapOohGoalToDigitalGoal("sales"), "CONVERSION");
    assert.equal(mapOohGoalToDigitalGoal("local"), "VISIT");
  });

  it("maps OOH industry to digital industry", () => {
    assert.equal(mapOohIndustryToDigital("indFb"), "FNB");
    assert.equal(mapOohIndustryToDigital("indRetail"), "ECOMMERCE");
    assert.equal(mapOohIndustryToDigital("indTech"), "APP");
  });

  it("builds digital payload with integrated channelType", () => {
    const payload = buildDigitalMixPayload({
      goal: "launch",
      industry: "indRetail",
      regions: ["seoul"],
      ageKeys: ["age30s"],
      gender: "F",
      digitalBudgetWon: 3_000_000,
      periodMonths: 3,
    });
    assert.equal(payload.channelType, "integrated");
    assert.equal(payload.goal, "AWARENESS");
    assert.equal(payload.industry, "ECOMMERCE");
    assert.equal(payload.budgetMonthly, 1_000_000);
    assert.equal(payload.periodWeeks, 12);
    assert.equal(payload.target.gender, "F");
  });

  it("maps national region to KR geo", () => {
    assert.equal(regionsToDigitalGeo(["national"]), "KR");
  });
});
