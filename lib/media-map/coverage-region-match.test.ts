import test from "node:test";
import assert from "node:assert/strict";
import { getSigunguCoverage } from "@/lib/geo/korea-sgg-coverage";
import {
  mediaMatchesCoverageRegion,
  resolveRegionFilterSigunguCodes,
} from "./coverage-region-match.ts";

const SEOUL_GANGNAM = resolveRegionFilterSigunguCodes({
  regionMain: "seoul",
  regionSub: "seoul_gangnam",
});
const BUSAN_HAEUNDAE = resolveRegionFilterSigunguCodes({
  regionMain: "busan",
  regionSub: "busan_haeundae",
});

function codeSet(filter: ReturnType<typeof resolveRegionFilterSigunguCodes>): Set<string> {
  assert.equal(filter.kind, "codes");
  return filter.kind === "codes" ? filter.codes : new Set();
}

function hasCode(
  filter: ReturnType<typeof resolveRegionFilterSigunguCodes>,
  code: string,
): boolean {
  return codeSet(filter).has(code);
}

test("seoul_gangnam — includes 서울 강남구·서초구", () => {
  assert.ok(hasCode(SEOUL_GANGNAM, "11680"), "강남구");
  assert.ok(hasCode(SEOUL_GANGNAM, "11650"), "서초구");
});

test("seoul_gangnam — blocks 광주·타 광역시 서구/남구 오탐", () => {
  const blocked = [
    "29155",
    "29140",
    "26140",
    "26170",
    "27140",
    "27200",
    "28140",
    "28177",
    "30140",
    "31140",
    "29110",
    "27110",
  ];
  for (const code of blocked) {
    assert.equal(
      hasCode(SEOUL_GANGNAM, code),
      false,
      `must not include ${getSigunguCoverage(code)?.sidoName} ${getSigunguCoverage(code)?.nameKo} (${code})`,
    );
  }
});

test("seoul_gangnam — does not include all 25 Seoul districts", () => {
  const codes = codeSet(SEOUL_GANGNAM);
  assert.ok(codes.size <= 4, `expected ≤4 codes, got ${codes.size}: ${[...codes].join(",")}`);
  assert.equal(hasCode(SEOUL_GANGNAM, "11110"), false, "종로구 should not match gangnam chip");
});

test("busan_haeundae — includes 해운대구 only (not all Busan)", () => {
  assert.ok(hasCode(BUSAN_HAEUNDAE, "26350"), "해운대구");
  const codes = [...codeSet(BUSAN_HAEUNDAE)].map(
    (c) => getSigunguCoverage(c)?.nameKo,
  );
  assert.ok(codes.length <= 2, `expected ≤2 Busan districts, got ${codes.join(",")}`);
  assert.equal(hasCode(BUSAN_HAEUNDAE, "26110"), false, "부산 중구");
});

test("mediaMatchesCoverageRegion — 광주 버스 blocked for seoul_gangnam", () => {
  const gwangjuBus = {
    type: "mobile" as const,
    coverageDistrictCodes: ["29110", "29140", "29155", "29170", "29200"],
  };
  assert.equal(
    mediaMatchesCoverageRegion(gwangjuBus, SEOUL_GANGNAM),
    false,
  );
});

test("mediaMatchesCoverageRegion — seoul mobile with gangnam coverage passes", () => {
  assert.equal(
    mediaMatchesCoverageRegion(
      { type: "mobile", coverageDistrictCodes: ["11680"] },
      SEOUL_GANGNAM,
    ),
    true,
  );
});

test("resolveRegionFilterSigunguCodes — gyeonggi main (unchanged)", () => {
  const filter = resolveRegionFilterSigunguCodes({ regionMain: "gyeonggi" });
  assert.equal(filter.kind, "codes");
  if (filter.kind === "codes") {
    assert.ok(filter.codes.has("41111"));
  }
});

test("mediaMatchesCoverageRegion — legacy 부산 vs 경기 coverage", () => {
  const filter = resolveRegionFilterSigunguCodes({ legacyRegion: "부산" });
  assert.equal(
    mediaMatchesCoverageRegion(
      { type: "mobile", coverageDistrictCodes: ["41111"] },
      filter,
    ),
    false,
  );
});
