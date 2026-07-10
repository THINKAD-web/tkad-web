import assert from "node:assert/strict";
import test from "node:test";
import {
  monthsFromDurationDays,
  parseDurationFields,
} from "@/lib/planner/parse-duration";

test("parseDurationFields: 11일", () => {
  const r = parseDurationFields("11일 집행");
  assert.equal(r.durationDays.value, 11);
  assert.equal(r.months.value, 1);
});

test("parseDurationFields: 2주", () => {
  const r = parseDurationFields("2주간");
  assert.equal(r.durationDays.value, 14);
  assert.equal(r.months.value, 1);
});

test("parseDurationFields: 2-3일", () => {
  const r = parseDurationFields("개최 2-3일 전");
  assert.equal(r.durationDays.value, 3);
  assert.equal(r.months.value, 1);
});

test("parseDurationFields: 7/19~29", () => {
  const r = parseDurationFields("7/19~29");
  assert.equal(r.durationDays.value, 11);
  assert.equal(r.months.value, 1);
});

test("parseDurationFields: 2026년7월19일~7월29일", () => {
  const r = parseDurationFields("2026년7월19일~7월29일");
  assert.equal(r.durationDays.value, 11);
  assert.equal(r.months.value, 1);
});

test("parseDurationFields: 3개월 explicit wins months", () => {
  const r = parseDurationFields("11일 3개월");
  assert.equal(r.durationDays.value, 11);
  assert.equal(r.months.value, 3);
});

test("monthsFromDurationDays: 45일 → 2개월", () => {
  assert.equal(monthsFromDurationDays(45, null), 2);
});

test("monthsFromDurationDays: 11일 → months 1", () => {
  assert.equal(monthsFromDurationDays(11, null), 1);
});

const UNESCO_BRIEF =
  "부산 벡스코 7/19~29 지하철 역사+버스쉘터 2026년7월19일~7월29일 11일";

test("parseDurationFields: 유네스코 문의 날짜 혼합 — 첫 범위 우선", () => {
  const r = parseDurationFields(UNESCO_BRIEF);
  assert.ok(r.durationDays.value != null && r.durationDays.value >= 11);
  assert.equal(r.months.value, 1);
});
