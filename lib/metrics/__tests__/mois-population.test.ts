import assert from "node:assert/strict";
import test from "node:test";
import { mapDistrictToMois } from "../district-mois-map";
import {
  filterSeoulGyeonggi,
  parseMoisCsv,
  parseMoisCsvLine,
} from "../mois-population";

const SAMPLE = `"행정구역","2026년07월_총인구수","2026년07월_세대수"
"서울특별시  (1100000000)","9,284,263","4,522,718"
"서울특별시 강남구 (1168000000)","552,631","244,825"
"서울특별시 서초구 (1165000000)","414,616","174,037"
"경기도  (4100000000)","13,768,157","6,181,804"
"경기도 성남시 (4113000000)","901,110","408,930"
"경기도 성남시 분당구 (4113500000)","467,039","192,854"
"경기도 수원시 장안구 (4111100000)","269,791","123,086"
"경기도 부천시 (4119000000)","754,851","344,211"
"경기도 부천시 원미구 (4119200000)","346,529","158,123"`;

const ROWS = filterSeoulGyeonggi(parseMoisCsv(SAMPLE, "2026-07"));

test("parseMoisCsvLine — 강남구", () => {
  const row = parseMoisCsvLine('"서울특별시 강남구 (1168000000)","552,631","244,825"');
  assert.ok(row);
  assert.equal(row.regionCode, "1168000000");
  assert.equal(row.population, 552_631);
  assert.equal(row.sigunguName, "강남구");
});

test("filterSeoulGyeonggi — 시도 집계·상위 시 제외", () => {
  assert.ok(ROWS.some((r) => r.sigunguName === "강남구"));
  assert.ok(ROWS.some((r) => r.sigunguName === "성남시 분당구"));
  assert.equal(ROWS.some((r) => r.sigunguName === "성남시"), false);
  assert.equal(ROWS.some((r) => r.regionName === "서울특별시"), false);
});

test("mapDistrictToMois — exact gu", () => {
  const r = mapDistrictToMois("강남구", ROWS);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.row.regionCode, "1168000000");
});

test("mapDistrictToMois — city gu compound", () => {
  const r = mapDistrictToMois("성남시 분당구", ROWS);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.row.sigunguName, "성남시 분당구");
});

test("mapDistrictToMois — broad coverage skip", () => {
  const r = mapDistrictToMois("서울 전역 (1~8호선)", ROWS);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "skip_broad_coverage");
});
