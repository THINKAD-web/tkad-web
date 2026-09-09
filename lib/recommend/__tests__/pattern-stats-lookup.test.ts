import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_PATTERN_STATS_SAMPLE_THRESHOLD_DEFAULT,
  getMinPatternStatsSampleThreshold,
} from "@/lib/recommend/pattern-stats-config";
import {
  appendPatternStatsOperationalNote,
  formatPatternStatsNote,
  patternComboFromAiInput,
  patternComboFromMatchingInput,
  patternComboFromPlannerBrief,
} from "@/lib/recommend/pattern-stats-lookup";
import { buildPatternComboKey } from "@/lib/recommend/pattern-stats-config";
import { buildOnlineReportInsights } from "@/lib/planner-report-export/online-report-insights";

describe("formatPatternStatsNote", () => {
  it("formats ko/en counts", () => {
    assert.match(formatPatternStatsNote(20, true), /20건/);
    assert.match(formatPatternStatsNote(20, false), /20 times/);
  });
});

describe("appendPatternStatsOperationalNote", () => {
  it("no-ops below threshold", () => {
    const base = ["existing"];
    const out = appendPatternStatsOperationalNote(
      base,
      getMinPatternStatsSampleThreshold() - 1,
      true,
    );
    assert.deepEqual(out, base);
  });

  it("appends when count meets threshold", () => {
    const out = appendPatternStatsOperationalNote(
      ["existing"],
      MIN_PATTERN_STATS_SAMPLE_THRESHOLD_DEFAULT,
      true,
    );
    assert.equal(out.length, 2);
    assert.match(out[1]!, /15건/);
  });
});

describe("patternComboFromAiInput", () => {
  it("maps recommend input to aggregate dimensions", () => {
    const combo = patternComboFromAiInput({
      goal: "awareness",
      target: "millennial",
      budgetMaxMan: 1000,
      region: "seoul",
      industry: "beauty",
      preferredPeriodWeeks: 4,
    });
    assert.equal(combo.source, "recommend");
    assert.equal(combo.industry, "beauty");
    assert.equal(combo.target, "millennial");
    assert.equal(combo.goal, "awareness");
    assert.equal(combo.budgetBucket, "1000_2999");
  });
});

describe("buildOnlineReportInsights pattern append", () => {
  it("appends operational note when count provided", () => {
    const insights = buildOnlineReportInsights({
      isKo: true,
      portfolio: [],
      ageText: "20-30",
      regionsText: "서울",
      channelCount: 1,
      budgetWon: 5_000_000,
      months: 1,
      patternStatsCount: 20,
    });
    assert.ok(
      insights.operationalNotes.some((line) => line.includes("20건")),
    );
  });

  it("skips append when count below threshold", () => {
    const without = buildOnlineReportInsights({
      isKo: true,
      portfolio: [],
      ageText: "20-30",
      regionsText: "서울",
      channelCount: 1,
      budgetWon: 5_000_000,
      months: 1,
    });
    const withLow = buildOnlineReportInsights({
      isKo: true,
      portfolio: [],
      ageText: "20-30",
      regionsText: "서울",
      channelCount: 1,
      budgetWon: 5_000_000,
      months: 1,
      patternStatsCount: 5,
    });
    assert.deepEqual(withLow.operationalNotes, without.operationalNotes);
  });
});

describe("patternComboFromPlannerBrief", () => {
  it("maps brief conversion to aggregate combo key", () => {
    const combo = patternComboFromPlannerBrief({
      briefGoal: "conversion",
      industryKey: "indOther",
      budgetMan: 1667,
      months: 1,
    });
    assert.equal(
      buildPatternComboKey(combo),
      "planner|other|mass|1000_2999|conversion",
    );
  });
});

describe("patternComboFromMatchingInput", () => {
  it("uses mass when targets empty", () => {
    const combo = patternComboFromMatchingInput("planner", {
      industry: "other",
      targets: [],
      goal: "brand",
      monthlyBudgetWon: 16_670_000,
    });
    assert.equal(combo.target, "mass");
    assert.equal(combo.budgetBucket, "1000_2999");
  });
});
