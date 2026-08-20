import assert from "node:assert/strict";
import test from "node:test";
import {
  busDailyTrafficPerVehicle,
  calcImpressions,
  exceedsPopulationCeiling,
  hasSovBasis,
  resolveSovShare,
} from "../impressions";
import { MAX_DAILY_FREQ } from "../constants";

test("정적 매체는 SOV 1.0", () => {
  assert.equal(resolveSovShare({ isStatic: true }), 1);
  assert.equal(resolveSovShare({ isStatic: true, spotDuration: 15, loopDuration: 300 }), 1);
});

test("loop 방식 SOV = spot / loop", () => {
  assert.equal(resolveSovShare({ spotDuration: 15, loopDuration: 300 }), 0.05);
});

test("시간당 재생 보장 방식 SOV = spot × plays / 3600", () => {
  const sov = resolveSovShare({ spotDuration: 15, playsPerHour: 4 });
  assert.ok(Math.abs(sov - 60 / 3600) < 1e-9);
});

test("SOV 근거가 없는 디지털 매체는 0 — 1.0 폴백 금지 (D-01 재발 방지)", () => {
  assert.equal(resolveSovShare({}), 0);
  assert.equal(hasSovBasis({}), false);
  assert.equal(hasSovBasis({ spotDuration: 15, loopDuration: 300 }), true);
});

test("D-01: M-CITY 15초/300초 loop → LTS 는 SOV 없음, impressions 는 SOV 적용", () => {
  const dailyTraffic = 160_000;
  const contactRate = 0.458;
  const sov = resolveSovShare({ spotDuration: 15, loopDuration: 300 });
  const r = calcImpressions({
    dailyTraffic,
    contactRate,
    sovShare: sov,
    units: 1,
    days: 30,
  });
  assert.equal(r.dailyLtsContacts, Math.round(dailyTraffic * contactRate));
  assert.ok(r.dailyImpressions < r.dailyLtsContacts);
  assert.equal(r.dailyImpressions, Math.round(r.dailyLtsContacts * sov));
});

test("D-01: M-CITY 15초/300초 loop → 노출이 SOV 미적용 대비 1/20", () => {
  const dailyTraffic = 160_000;
  const contactRate = 0.458;
  const withoutSov = calcImpressions({
    dailyTraffic,
    contactRate,
    sovShare: 1,
    units: 1,
    days: 30,
  });
  const withSov = calcImpressions({
    dailyTraffic,
    contactRate,
    sovShare: resolveSovShare({ spotDuration: 15, loopDuration: 300 }),
    units: 1,
    days: 30,
  });

  // 현재 프로덕션 표기(2.2M)를 재현하는지 확인 — 가시율만 적용된 값
  assert.ok(Math.abs(withoutSov.totalImpressions - 2_198_400) < 2_000);
  // SOV 적용 후 정확히 1/20
  const ratio = withoutSov.totalImpressions / withSov.totalImpressions;
  assert.ok(Math.abs(ratio - 20) < 0.01, `ratio=${ratio}`);
});

test("D-02: 버스 1대 기본 일 OTS = 12 왕복 × 3,500명", () => {
  assert.equal(busDailyTrafficPerVehicle(), 42_000);
  assert.equal(
    busDailyTrafficPerVehicle({ roundTripsPerDay: 10, exposurePerTrip: 2_000 }),
    20_000,
  );
});

test("D-02: 버스 1대 30일 노출 ≈ 189,000회", () => {
  const { totalImpressions } = calcImpressions({
    dailyTraffic: busDailyTrafficPerVehicle(),
    contactRate: 0.15,
    sovShare: 1,
    units: 1,
    days: 30,
  });
  assert.equal(totalImpressions, 189_000);
});

test("units 는 선형으로 곱해진다 (버스 10대)", () => {
  const one = calcImpressions({
    dailyTraffic: 42_000,
    contactRate: 0.15,
    sovShare: 1,
    units: 1,
    days: 30,
  });
  const ten = calcImpressions({
    dailyTraffic: 42_000,
    contactRate: 0.15,
    sovShare: 1,
    units: 10,
    days: 30,
  });
  assert.equal(ten.totalImpressions, one.totalImpressions * 10);
});

test("contactRate·sovShare 는 0~1 로 클램프된다", () => {
  const r = calcImpressions({
    dailyTraffic: 1_000,
    contactRate: 5,
    sovShare: 3,
    units: 1,
    days: 1,
  });
  assert.equal(r.totalImpressions, 1_000);
});

test("R-01: 인구 상한 — 버스 1대 3,800만회는 위반, 189K 는 정상", () => {
  const seoul = 9_400_000;
  assert.equal(
    exceedsPopulationCeiling({
      totalImpressions: 38_000_000,
      // 버스 1대의 커버 모집단은 서울 전체가 아니라 노선 접점 인구다
      coveragePopulation: 42_000,
      days: 30,
      maxDailyFreq: MAX_DAILY_FREQ,
    }),
    true,
  );
  assert.equal(
    exceedsPopulationCeiling({
      totalImpressions: 189_000,
      coveragePopulation: 42_000,
      days: 30,
      maxDailyFreq: MAX_DAILY_FREQ,
    }),
    false,
  );
  // 모집단 미상이면 이 규칙으로는 판정하지 않는다
  assert.equal(
    exceedsPopulationCeiling({
      totalImpressions: 38_000_000,
      coveragePopulation: 0,
      days: 30,
      maxDailyFreq: MAX_DAILY_FREQ,
    }),
    false,
  );
  assert.ok(seoul > 0);
});
