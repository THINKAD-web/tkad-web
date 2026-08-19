import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMoisPopulationIndex,
  resolveMediaCoverage,
} from "../coverage-map";
import type { MoisSigunguRow } from "../mois-population";

const ROWS: MoisSigunguRow[] = [
  {
    regionCode: "1168000000",
    regionName: "서울특별시 강남구",
    sidoName: "서울특별시",
    sigunguName: "강남구",
    population: 552_631,
    referenceMonth: "2026-07",
  },
  {
    regionCode: "1165000000",
    regionName: "서울특별시 서초구",
    sidoName: "서울특별시",
    sigunguName: "서초구",
    population: 414_616,
    referenceMonth: "2026-07",
  },
  {
    regionCode: "1111000000",
    regionName: "서울특별시 종로구",
    sidoName: "서울특별시",
    sigunguName: "종로구",
    population: 136_139,
    referenceMonth: "2026-07",
  },
  {
    regionCode: "4113500000",
    regionName: "경기도 성남시 분당구",
    sidoName: "경기도",
    sigunguName: "성남시 분당구",
    population: 467_039,
    referenceMonth: "2026-07",
  },
  {
    regionCode: "4111700000",
    regionName: "경기도 수원시 영통구",
    sidoName: "경기도",
    sigunguName: "수원시 영통구",
    population: 362_098,
    referenceMonth: "2026-07",
  },
];

const INDEX = buildMoisPopulationIndex(ROWS);

test("1순위 district — 강남구 단일", () => {
  const r = resolveMediaCoverage(
    { regionMain: "seoul", regionSub: "seoul_gangnam", district: "강남구", city: "서울" },
    ROWS,
    INDEX,
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.coverageDongs.length, 1);
    assert.equal(r.coverageDongs[0]!.code, "1168000000");
    assert.equal(r.coveragePopulation, 552_631);
  }
});

test("broad — 서울 전역 균등 배분", () => {
  const seoulOnly = ROWS.filter((r) => r.sidoName === "서울특별시");
  const r = resolveMediaCoverage(
    { regionMain: "seoul", regionSub: null, district: "서울 전역 (1~8호선)", city: null },
    seoulOnly,
    buildMoisPopulationIndex(seoulOnly),
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.coverageDongs.length, 3);
    assert.ok(Math.abs(r.coverageDongs[0]!.weight - 1 / 3) < 0.001);
  }
});

test("dot list — 강남·서초·분당·영통", () => {
  const r = resolveMediaCoverage(
    {
      regionMain: "seoul",
      regionSub: null,
      district: "강남·서초·분당·영통",
      city: null,
    },
    ROWS,
    INDEX,
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.coverageDongs.length, 4);
});

test("region_main mismatch — 부평구/인천", () => {
  const r = resolveMediaCoverage(
    { regionMain: "seoul", regionSub: null, district: "부평구", city: "인천" },
    ROWS,
    INDEX,
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /region_main_mismatch/);
});

test("2순위 regionSub — seoul_gangnam cluster", () => {
  const r = resolveMediaCoverage(
    { regionMain: "seoul", regionSub: "seoul_gangnam", district: null, city: "서울" },
    ROWS,
    INDEX,
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.ok(r.coverageDongs.length >= 2);
});
