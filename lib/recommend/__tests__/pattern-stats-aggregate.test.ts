import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bucketMonthlyBudgetWon,
  buildPatternComboKey,
  isExcludedPatternCombo,
} from "@/lib/recommend/pattern-stats-config";
import {
  aggregateRecommendationLogs,
  dimensionsFromLog,
  fingerprintRecommendationInput,
  shouldCountWithBurstDedupe,
} from "@/lib/recommend/pattern-stats-aggregate";
import type { RecommendationLogAggregateRecord } from "@/lib/recommend/pattern-stats-aggregate";

function logRow(
  overrides: Partial<RecommendationLogAggregateRecord> &
    Pick<RecommendationLogAggregateRecord, "input">,
  index: number,
): RecommendationLogAggregateRecord {
  return {
    source: "planner",
    recommendations: [{ mediaId: "media_a" }],
    createdAt: new Date(`2026-09-01T10:0${index % 10}:00.000Z`),
    ...overrides,
  };
}

describe("bucketMonthlyBudgetWon", () => {
  it("maps STEP1 skew monthly budget to 1000_2999", () => {
    assert.equal(bucketMonthlyBudgetWon(16_670_000), "1000_2999");
  });

  it("returns unknown for non-positive values", () => {
    assert.equal(bucketMonthlyBudgetWon(0), "unknown");
  });
});

describe("isExcludedPatternCombo", () => {
  it("excludes known planner skew combo", () => {
    const combo = dimensionsFromLog("planner", {
      industry: "other",
      targets: ["mass"],
      goal: "awareness",
      monthlyBudgetWon: 16_670_000,
    });
    assert.equal(isExcludedPatternCombo(combo), true);
    assert.equal(
      buildPatternComboKey(combo),
      "planner|other|mass|1000_2999|awareness",
    );
  });
});

describe("burst dedupe", () => {
  it("counts only one identical payload within the burst window", () => {
    const input = {
      industry: "retail",
      targets: ["mz"],
      goal: "launch",
      monthlyBudgetWon: 5_000_000,
      regions: ["seoul", "capital"],
      seed: 1,
      _meta: { cached: false },
    };
    const fp = fingerprintRecommendationInput(input);
    const map = new Map<string, number[]>();
    const t0 = Date.parse("2026-09-01T10:00:00.000Z");
    const t1 = t0 + 15 * 60_000;

    assert.equal(
      shouldCountWithBurstDedupe({
        fingerprint: fp,
        createdAtMs: t0,
        lastCountedAtByFingerprint: map,
        windowMs: 3_600_000,
        maxPerWindow: 1,
      }),
      true,
    );
    assert.equal(
      shouldCountWithBurstDedupe({
        fingerprint: fp,
        createdAtMs: t1,
        lastCountedAtByFingerprint: map,
        windowMs: 3_600_000,
        maxPerWindow: 1,
      }),
      false,
    );
  });
});

describe("aggregateRecommendationLogs", () => {
  it("filters excluded combo and dedupes burst payloads", () => {
    const skewInput = {
      industry: "other",
      targets: ["mass"],
      goal: "awareness",
      monthlyBudgetWon: 16_670_000,
    };
    const goodInput = {
      industry: "retail",
      targets: ["mz"],
      goal: "launch",
      monthlyBudgetWon: 5_000_000,
    };

    const result = aggregateRecommendationLogs([
      logRow({ source: "planner", input: skewInput }, 0),
      logRow({ source: "planner", input: skewInput }, 1),
      logRow({ source: "recommend", input: goodInput }, 2),
      logRow(
        {
          source: "recommend",
          input: { ...goodInput, seed: 9, _meta: { cached: true } },
          createdAt: new Date("2026-09-01T10:05:00.000Z"),
        },
        3,
      ),
    ]);

    assert.equal(result.excludedComboLogs, 2);
    assert.equal(result.burstFilteredLogs, 1);
    assert.equal(result.countedLogs, 1);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]?.count, 1);
    assert.equal(result.rows[0]?.source, "recommend");
  });
});
