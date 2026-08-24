#!/usr/bin/env npx tsx
/**
 * A-4 region mapping — local inference diagnosis (no DB required).
 * Run: npx tsx scripts/a4-diagnose-region-mapping.mts
 */
import { inferBrowseRegionFromMedia } from "../lib/media-browse-regions.ts";
import { mapDistrictToRegionZone } from "../lib/media-regions.ts";

type Case = {
  id: string;
  issue: "3-1" | "3-2" | "3-3";
  input: Parameters<typeof inferBrowseRegionFromMedia>[0];
  note?: string;
};

const CASES: Case[] = [
  {
    id: "seoul_univ_gwanak_district",
    issue: "3-1",
    input: {
      regionMain: "seoul",
      regionSub: null,
      regionZone: "gwanak",
      district: "관악구",
      city: "서울",
      location: "서울대입구역 2호선",
      name: "서울대입구역 맥스비전",
    },
    note: "Expected browse sub: seoul_gwanak (missing today) — not seoul_guro",
  },
  {
    id: "seoul_univ_wrong_guro_sub",
    issue: "3-1",
    input: {
      regionMain: "seoul",
      regionSub: "seoul_guro",
      regionZone: "gwanak",
      district: "관악구",
      city: "서울",
      location: "서울대입구역",
      name: "서울대입구역",
    },
    note: "Stored seoul_guro + district 관악 = explicit mismatch",
  },
  {
    id: "busan_city_bus_default",
    issue: "3-2",
    input: {
      regionMain: "busan",
      regionSub: null,
      regionZone: null,
      district: null,
      city: "부산",
      location: "부산 시내버스 전 노선",
      name: "부산 시내버스 래핑",
    },
    note: "Bare region=busan often infers busan_downtown",
  },
  {
    id: "jp_shibuya_overseas_sub",
    issue: "3-3",
    input: {
      regionMain: "overseas",
      regionSub: "overseas",
      regionZone: null,
      district: "Shibuya Crossing",
      city: "Tokyo",
      location: "Shibuya Crossing, Tokyo",
      name: "Shibuya Vision",
    },
    note: "regionSub=overseas wins over district → 상권표 omitted",
  },
  {
    id: "jp_shibuya_district_only",
    issue: "3-3",
    input: {
      regionMain: "overseas",
      regionSub: null,
      regionZone: null,
      district: "Shibuya Station",
      city: "Tokyo",
      location: "Shibuya Station",
      name: "Shibuya Station Vision",
    },
    note: "Without regionSub, district can classify (needs 2+ distinct keys)",
  },
];

console.log("=== A-4 Region Mapping Diagnosis ===\n");

for (const c of CASES) {
  const inferred = inferBrowseRegionFromMedia({
    region: c.input.regionMain ?? null,
    regionZone: c.input.regionZone ?? null,
    city: c.input.city ?? null,
    district: c.input.district ?? null,
    location: c.input.location ?? null,
  });
  const zone =
    c.input.district != null
      ? mapDistrictToRegionZone(c.input.district, c.input.regionMain ?? undefined)
      : null;

  console.log(`[${c.issue}] ${c.id}`);
  console.log(`  note: ${c.note ?? ""}`);
  console.log(`  stored regionSub: ${c.input.regionSub ?? "(null)"}`);
  console.log(`  inferred browse: ${inferred.main ?? "?"}/${inferred.sub ?? "?"}`);
  console.log(`  regionZone from district: ${zone ?? "(null)"}`);
  console.log("");
}

console.log("=== 3-3 Shibuya ===");
console.log(
  "regionSub=overseas on all JP media → pickRegionSubdivisionField prefers regionSub → single bucket → 상권표 omitted (≥2 keys required).",
);
console.log(
  "See lib/planner-report-export/__tests__/overseas-japan-awareness-fixture.test.ts",
);

console.log("\nDone. See reports/a4-region-mapping-diagnosis.md for full write-up.");
