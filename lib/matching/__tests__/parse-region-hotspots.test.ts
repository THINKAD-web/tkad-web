import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRegionHotspots } from "@/lib/matching/parse-region-hotspots";

test("parse-region-hotspots: no jeju → empty", () => {
  const r = parseRegionHotspots("서울 강남 상권 타깃");
  assert.deepEqual(r.value, []);
});

test("parse-region-hotspots: STEP1 1안 거점 문구", () => {
  const r = parseRegionHotspots(
    "제주도민 주요 생활권·이동 동선 고려",
  );
  const types = r.value.map((h) => h.type).sort();
  assert.ok(types.includes("residential"));
  assert.ok(types.includes("transit_corridor"));
  assert.ok(r.value.every((h) => h.regionId === "jeju"));
});

test("parse-region-hotspots: dedupe same type", () => {
  const r = parseRegionHotspots("제주 관광 관광객");
  const tourist = r.value.filter((h) => h.type === "tourist");
  assert.equal(tourist.length, 1);
});
