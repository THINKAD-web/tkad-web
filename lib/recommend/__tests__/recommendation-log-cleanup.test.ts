import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PATTERN_STATS_AGGREGATE_MAX_AGE_MS,
  evaluateAggregateGate,
  resolveCleanupDryRun,
  resolveRecommendationLogCutoff,
} from "@/lib/recommend/pattern-stats-config";

describe("resolveRecommendationLogCutoff", () => {
  it("subtracts ttl days from now", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const cutoff = resolveRecommendationLogCutoff(now, 180);
    assert.equal(
      cutoff.toISOString(),
      new Date(now.getTime() - 180 * 86_400_000).toISOString(),
    );
  });
});

describe("resolveCleanupDryRun", () => {
  const env = process.env.RECOMMENDATION_LOG_CLEANUP_DRY_RUN;

  it("defaults to dry-run when env unset", () => {
    delete process.env.RECOMMENDATION_LOG_CLEANUP_DRY_RUN;
    assert.equal(resolveCleanupDryRun(undefined), true);
  });

  it("query param overrides env", () => {
    process.env.RECOMMENDATION_LOG_CLEANUP_DRY_RUN = "false";
    assert.equal(resolveCleanupDryRun("1"), true);
    assert.equal(resolveCleanupDryRun("0"), false);
    process.env.RECOMMENDATION_LOG_CLEANUP_DRY_RUN = env;
  });
});

describe("evaluateAggregateGate", () => {
  const now = new Date("2026-09-09T03:00:00.000Z");

  it("blocks when aggregate never succeeded", () => {
    const gate = evaluateAggregateGate(null, now);
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "aggregate_never_succeeded");
  });

  it("allows when aggregate succeeded within max age", () => {
    const at = new Date(now.getTime() - 2 * 86_400_000).toISOString();
    const gate = evaluateAggregateGate({ ok: true, at }, now);
    assert.equal(gate.allowed, true);
  });

  it("blocks when aggregate is stale", () => {
    const at = new Date(
      now.getTime() - PATTERN_STATS_AGGREGATE_MAX_AGE_MS - 1,
    ).toISOString();
    const gate = evaluateAggregateGate({ ok: true, at }, now);
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, "aggregate_stale");
  });
});
