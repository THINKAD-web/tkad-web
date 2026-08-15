import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMPAIGN_PLAN_ENGINE_VERSION,
  CAMPAIGN_PLAN_TTL_DAYS,
  defaultExpiresAt,
  isEngineVersionCurrent,
  snapshotWithEngineVersion,
} from "./campaign-plan-schema.ts";

const SAMPLE = {
  brief: {
    budgetWon: 30_000_000,
    regionCodes: ["11", "41"],
    genders: ["female"],
    ageBands: ["20s", "30s"],
    flightStart: "2026-09-01",
    flightEnd: "2026-09-14",
  } as const,
  mediaMix: [
    {
      mediaId: "m-city",
      name: "M-CITY",
      units: 1,
      days: 14,
      priceWon: 45_000_000,
      priceIsEstimate: false,
      impressions: 1_000_000,
      cpmWon: 45_000,
    },
  ],
  metrics: {
    netReach: 200_000,
    targetPopulation: 1_500_000,
    reachRate: 0.133,
    frequency: 5,
    grp: 66.5,
    effectiveReach: 60_000,
    effectiveReachRate: 0.04,
    totalImpressions: 1_000_000,
    mixCpmWon: 45_000,
    totalCostWon: 45_000_000,
  },
};

test("스냅샷에 현재 엔진 버전이 자동 기록된다", () => {
  const snap = snapshotWithEngineVersion(SAMPLE);
  assert.equal(snap.engineVersion, CAMPAIGN_PLAN_ENGINE_VERSION);
  assert.equal(isEngineVersionCurrent(snap), true);
});

test("과거 버전 스냅샷은 최신 아님으로 표시된다", () => {
  assert.equal(
    isEngineVersionCurrent({ engineVersion: "v0.0.1-alpha" }),
    false,
  );
});

test("TTL 30일 = 기본 만료 시각", () => {
  assert.equal(CAMPAIGN_PLAN_TTL_DAYS, 30);
  const now = new Date("2026-09-01T00:00:00Z");
  const exp = defaultExpiresAt(now);
  assert.equal(exp.toISOString(), "2026-10-01T00:00:00.000Z");
});
