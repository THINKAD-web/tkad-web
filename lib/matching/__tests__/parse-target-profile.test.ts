import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTargetProfile } from "@/lib/matching/parse-target-profile";

test("parseTargetProfile: 내국인 70% + 외국인 30%", () => {
  const r = parseTargetProfile(
    "타깃: 내국인 70% + 외국인 30% (조정 가능)",
  );
  assert.equal(r.confidence, "high");
  assert.equal(r.value?.nationality, "mixed");
  assert.deepEqual(r.value?.nationalityRatio, { domestic: 70, foreign: 30 });
});

test("parseTargetProfile: 제주도민 → resident + segment mass", () => {
  const r = parseTargetProfile("타깃: 내국인(제주도민)");
  assert.equal(r.value?.nationality, "domestic");
  assert.equal(r.value?.residency, "resident");
  assert.equal(r.value?.segment, "mass");
});

test("parseTargetProfile: 관광객 → tourist segment", () => {
  const r = parseTargetProfile("타깃: 관광객 중심");
  assert.equal(r.value?.residency, "tourist");
  assert.equal(r.value?.segment, "tourist");
});

test("parseTargetProfile: unmatched → null", () => {
  const r = parseTargetProfile("강남 2030 500만원");
  assert.equal(r.value, null);
});
