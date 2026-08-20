import assert from "node:assert/strict";
import test from "node:test";
import { calcNetReach, resolveTargetPopulation } from "../reach";
import type { DongProfile, PlannedMedia } from "../types";

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

function media(
  id: string,
  dailyImpressions: number,
  codes: string[],
  days = 14,
  dailyLtsContacts?: number,
): PlannedMedia {
  const weight = 1 / codes.length;
  const lts = dailyLtsContacts ?? dailyImpressions;
  return {
    mediaId: id,
    dailyLtsContacts: lts,
    dailyImpressions,
    totalImpressions: dailyImpressions * days,
    coverageDongs: codes.map((code) => ({ code, weight })),
  };
}

test("타깃 모집단 — 20~30대 여성은 전체 인구의 성별×연령 곱", () => {
  const pop = resolveTargetPopulation(dong("x", 100_000), {
    genders: ["female"],
    ageBands: ["20s", "30s"],
  });
  // 100,000 × 0.52 × (0.28 + 0.24) = 27,040
  assert.ok(Math.abs(pop - 27_040) < 1);
});

test("타깃 미지정이면 전체 인구", () => {
  assert.equal(resolveTargetPopulation(dong("x", 100_000), {}), 100_000);
});

test("성별·연령 데이터가 없으면 전국 평균으로 폴백한다", () => {
  const pop = resolveTargetPopulation(
    { code: "x", population: 100_000 },
    { genders: ["female"] },
  );
  assert.ok(pop > 0 && pop < 100_000);
});

test("인수조건: 도달률은 100% 를 넘지 않는다 (극단적 과다 노출 입력)", () => {
  const absurd = [
    media("m1", 50_000_000, ["1168051", "1168052", "1168053", "1114055"]),
    media("m2", 50_000_000, ["1168051", "1168052"]),
    media("m3", 50_000_000, ["1168051"]),
  ];
  const r = calcNetReach({
    medias: absurd,
    dongs: DONGS,
    target: { genders: ["female"], ageBands: ["20s", "30s"] },
    days: 14,
  });

  assert.ok(r.reachRate <= 1, `reachRate=${r.reachRate}`);
  assert.ok(r.netReach <= r.targetPopulation);
  assert.ok(r.effectiveReach <= r.netReach);
  assert.ok(r.effectiveReachRate <= 1);
});

test("인수조건: 매체가 늘면 Reach 는 체감 증가, Frequency 는 증가", () => {
  const codes = ["1168051", "1168052", "1168053", "1114055"];
  const one = [media("m0", 3_000, codes)];
  const ten = Array.from({ length: 10 }, (_, i) => media(`m${i}`, 3_000, codes));

  const target = { genders: ["female"], ageBands: ["20s", "30s"] } as const;
  const a = calcNetReach({ medias: one, dongs: DONGS, target, days: 14 });
  const b = calcNetReach({ medias: ten, dongs: DONGS, target, days: 14 });

  // Reach 는 늘지만 10배까지는 못 간다 (중복 제거 + 상관 보정)
  assert.ok(b.netReach > a.netReach);
  assert.ok(b.netReach < a.netReach * 10, `1개=${a.netReach} 10개=${b.netReach}`);
  // Frequency 는 증가
  assert.ok(b.frequency > a.frequency);
  assert.equal(b.totalImpressions, a.totalImpressions * 10);
});

test("매체를 한 개씩 더할수록 증분 도달은 단조 감소한다", () => {
  const codes = ["1168051", "1168052"];
  const target = { ageBands: ["20s", "30s"] } as const;
  const reaches: number[] = [];
  for (let n = 1; n <= 6; n += 1) {
    const medias = Array.from({ length: n }, (_, i) => media(`m${i}`, 2_500, codes));
    reaches.push(calcNetReach({ medias, dongs: DONGS, target, days: 14 }).netReach);
  }
  for (let i = 2; i < reaches.length; i += 1) {
    const prevDelta = reaches[i - 1] - reaches[i - 2];
    const delta = reaches[i] - reaches[i - 1];
    assert.ok(delta >= 0, `도달 감소: ${reaches[i - 1]} → ${reaches[i]}`);
    assert.ok(delta <= prevDelta + 1e-6, `증분 반등: ${prevDelta} → ${delta}`);
  }
});

test("GRP = 도달률(%) × 빈도", () => {
  const r = calcNetReach({
    medias: [media("m1", 4_000, ["1168051", "1168052"])],
    dongs: DONGS,
    target: { ageBands: ["20s", "30s"] },
    days: 14,
  });
  assert.ok(Math.abs(r.grp - r.reachRate * 100 * r.frequency) < 1e-6);
  assert.ok(r.grp > 0);
});

test("커버 행정동이 없는 매체는 도달에 기여하지 않는다", () => {
  const r = calcNetReach({
    medias: [media("m1", 10_000, ["9999999"])],
    dongs: DONGS,
    target: {},
    days: 14,
  });
  assert.equal(r.netReach, 0);
  assert.equal(r.reachRate, 0);
  assert.equal(r.frequency, 0);
  assert.equal(r.grp, 0);
});

test("상관계수 rho 를 0 으로 두면 도달이 과대 추정된다 (기본 0.7 의 근거)", () => {
  const codes = ["1168051", "1168052"];
  const medias = Array.from({ length: 5 }, (_, i) => media(`m${i}`, 2_000, codes));
  const target = { ageBands: ["20s", "30s"] } as const;

  const independent = calcNetReach({ medias, dongs: DONGS, target, days: 14, rho: 0 });
  const correlated = calcNetReach({ medias, dongs: DONGS, target, days: 14 });

  assert.ok(independent.netReach > correlated.netReach);
  assert.ok(independent.reachRate <= 1);
});

test("기간이 길수록 도달률은 올라간다", () => {
  const codes = ["1168051", "1168052"];
  const target = { ageBands: ["20s", "30s"] } as const;
  const week = calcNetReach({
    medias: [media("m1", 2_000, codes, 7)],
    dongs: DONGS,
    target,
    days: 7,
  });
  const month = calcNetReach({
    medias: [media("m1", 2_000, codes, 30)],
    dongs: DONGS,
    target,
    days: 30,
  });
  assert.ok(month.reachRate > week.reachRate);
  assert.ok(month.reachRate <= 1);
});
