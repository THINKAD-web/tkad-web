import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  briefAgeBandsToPlannerKeys,
  briefBudgetMan,
  briefGoalToPlanner,
  briefIndustryToPlanner,
  briefPeriodMonths,
  briefRegionsForIntegrated,
  buildBriefIntegratedMixRequest,
} from "@/lib/planner/brief/brief-integrated-adapters";
import { EMPTY_BRIEF } from "@/lib/planner/brief/types";

describe("brief-integrated-adapters", () => {
  it("maps brief goal to planner campaign goal", () => {
    assert.equal(briefGoalToPlanner("awareness"), "brand");
    assert.equal(briefGoalToPlanner("consideration"), "launch");
    assert.equal(briefGoalToPlanner("conversion"), "sales");
    assert.equal(briefGoalToPlanner(null), "brand");
  });

  it("maps brief industry to planner industry key", () => {
    assert.equal(briefIndustryToPlanner("tech"), "indTech");
    assert.equal(briefIndustryToPlanner(null), "indOther");
  });

  it("maps age bands to planner age keys (10s skipped)", () => {
    assert.deepEqual(briefAgeBandsToPlannerKeys(["20s", "30s"]), [
      "age20s",
      "age30s",
    ]);
    assert.deepEqual(briefAgeBandsToPlannerKeys(["10s"]), []);
  });

  it("defaults empty regions to seoul for integrated API", () => {
    assert.deepEqual(briefRegionsForIntegrated([]), ["seoul"]);
    assert.deepEqual(briefRegionsForIntegrated(["11", "41"]), [
      "seoul",
      "gyeonggi",
    ]);
  });

  it("builds mix request when budget is set", () => {
    const brief = {
      ...EMPTY_BRIEF,
      budgetInputWon: 50_000_000,
      budgetMode: "total" as const,
      goal: "awareness" as const,
      industry: "retail" as const,
      regionCodes: ["11"] as const,
      flightStart: "2026-08-01",
      flightEnd: "2026-08-31",
    };
    assert.equal(briefBudgetMan(brief), 5000);
    assert.equal(briefPeriodMonths(brief), 1);

    const req = buildBriefIntegratedMixRequest({
      brief,
      digitalBudgetPct: 30,
      selectedOohMediaIds: ["m1"],
      locale: "ko",
    });
    assert.ok(req);
    assert.equal(req!.channelType, "integrated");
    assert.equal(req!.goal, "brand");
    assert.equal(req!.industry, "indRetail");
    assert.deepEqual(req!.regions, ["seoul"]);
    assert.equal(req!.digitalBudgetPct, 30);
    assert.deepEqual(req!.selectedOohMediaIds, ["m1"]);
  });

  it("returns null mix request when budget is zero", () => {
    const req = buildBriefIntegratedMixRequest({
      brief: EMPTY_BRIEF,
      digitalBudgetPct: 30,
      selectedOohMediaIds: [],
      locale: "ko",
    });
    assert.equal(req, null);
  });
});
