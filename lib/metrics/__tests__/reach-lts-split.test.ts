import assert from "node:assert/strict";
import test from "node:test";
import { calcImpressions } from "../impressions";
import { calcNetReach } from "../reach";
import type { DongProfile, PlannedMedia, ReachResult } from "../types";
import { DONG_CORRELATION_RHO } from "../constants";

function dong(code: string, population: number): DongProfile {
  return {
    code,
    population,
    genderSplit: { male: 0.48, female: 0.52 },
    ageSplit: { "10s": 0.08, "20s": 0.28, "30s": 0.24, "40s": 0.18, "50s+": 0.22 },
  };
}

const DONGS: DongProfile[] = [
  dong("1168051", 30_000),
  dong("1168052", 25_000),
  dong("1168053", 20_000),
  dong("1114055", 18_000),
];

const TARGET = { genders: ["female"], ageBands: ["20s", "30s"] } as const;
const DAYS = 14;

function planned(
  id: string,
  dailyImpressions: number,
  dailyLtsContacts: number,
  codes: string[],
): PlannedMedia {
  const weight = 1 / codes.length;
  return {
    mediaId: id,
    dailyLtsContacts,
    dailyImpressions,
    totalImpressions: dailyImpressions * DAYS,
    coverageDongs: codes.map((code) => ({ code, weight })),
  };
}

/** Phase 4a-5 이전: dailyP 에 impressions(SOV 포함)를 쓰던 경로 */
function calcNetReachLegacyImpressionsDailyP(params: {
  medias: readonly PlannedMedia[];
  dongs: readonly DongProfile[];
  target: typeof TARGET;
  days: number;
}): ReachResult {
  const patched = params.medias.map((m) => ({
    ...m,
    dailyLtsContacts: m.dailyImpressions,
  }));
  return calcNetReach({ ...params, medias: patched });
}

test("[4a-5] wrap(SOV=1): dailyLts === dailyImpressions 이면 reach·frequency 변화 없음", () => {
  const codes = ["1168051", "1168052", "1168053", "1114055"];
  const medias = [
    planned("wrap1", 3_750_000, 3_750_000, codes),
    planned("wrap2", 2_700_000, 2_700_000, codes),
    planned("wrap3", 2_700_000, 2_700_000, codes),
  ];

  const legacy = calcNetReachLegacyImpressionsDailyP({
    medias,
    dongs: DONGS,
    target: TARGET,
    days: DAYS,
  });
  const current = calcNetReach({
    medias,
    dongs: DONGS,
    target: TARGET,
    days: DAYS,
  });

  assert.equal(current.netReach, legacy.netReach);
  assert.equal(current.frequency, legacy.frequency);
  assert.equal(current.reachRate, legacy.reachRate);
  assert.equal(current.totalImpressions, legacy.totalImpressions);
});

test("[4a-5] loop(SOV<1): reach 유지(↑), frequency만 감소, impressions 동일", () => {
  const codes = ["1168051", "1168052"];
  // SOV 0.1 — LTS 10× impressions
  const medias = [planned("loop1", 1_000, 10_000, codes)];

  const legacy = calcNetReachLegacyImpressionsDailyP({
    medias,
    dongs: DONGS,
    target: TARGET,
    days: DAYS,
  });
  const current = calcNetReach({
    medias,
    dongs: DONGS,
    target: TARGET,
    days: DAYS,
  });

  assert.equal(current.totalImpressions, legacy.totalImpressions);
  assert.ok(current.netReach > legacy.netReach, "LTS reach > legacy SOV-in-reach");
  assert.ok(current.frequency < legacy.frequency, "frequency = imp/reach 감소");
  assert.ok(current.reachRate <= 1);
  assert.ok(current.netReach <= current.targetPopulation);
});

test("[4a-5] loop-only mix — reachRate·netReach·coverage 가드 유지", () => {
  const codes = ["1168051", "1168052", "1168053"];
  const medias = Array.from({ length: 5 }, (_, i) =>
    planned(`loop${i}`, 500, 5_000, codes),
  );

  const r = calcNetReach({
    medias,
    dongs: DONGS,
    target: TARGET,
    days: DAYS,
    rho: DONG_CORRELATION_RHO,
  });

  assert.ok(r.reachRate <= 1);
  assert.ok(r.netReach <= r.targetPopulation);
  assert.ok(r.frequency > 0);
  assert.ok(r.totalImpressions > 0);
});

test("[4a-5] calcImpressions — LTS 는 SOV 미적용, impressions 는 SOV 적용", () => {
  const r = calcImpressions({
    dailyTraffic: 4_230_000,
    contactRate: 0.15,
    sovShare: 0.1,
    units: 1,
    days: 14,
  });
  assert.equal(r.dailyLtsContacts, Math.round(4_230_000 * 0.15));
  assert.equal(r.dailyImpressions, Math.round(4_230_000 * 0.15 * 0.1));
  assert.equal(r.totalImpressions, r.dailyImpressions * 14);
});
