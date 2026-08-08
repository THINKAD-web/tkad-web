import assert from "node:assert/strict";
import test from "node:test";
import {
  linearMonthlyDeviation,
  normalizePriceOptions,
  periodToDays,
  resolvePrice,
} from "../price";
import type { PriceOption } from "../types";

/** M-CITY 실제 가격표 */
const MCITY: PriceOption[] = [
  { days: 7, price: 25_000_000, id: "po-7", label: "7일" },
  { days: 15, price: 45_000_000, id: "po-15", label: "15일" },
  { days: 30, price: 70_000_000, id: "po-30", label: "1개월" },
];

test("periodToDays — 미상 기간은 임의 추정하지 않는다", () => {
  assert.equal(periodToDays("day"), 1);
  assert.equal(periodToDays("week"), 7);
  assert.equal(periodToDays("biweekly"), 14);
  assert.equal(periodToDays("month"), 30);
  assert.equal(periodToDays("quarter"), null);
  assert.equal(periodToDays(null), null);
});

test("normalizePriceOptions — 무효 옵션 제거 + 일수 오름차순", () => {
  const sorted = normalizePriceOptions([
    { days: 30, price: 70_000_000 },
    { days: 0, price: 100 },
    { days: 7, price: 25_000_000 },
    { days: 15, price: -1 },
  ]);
  assert.deepEqual(
    sorted.map((o) => o.days),
    [7, 30],
  );
});

test("D-04: 30일 조회 시 실제 월 상품가 7,000만 — 선형 1억이 아니다", () => {
  const r = resolvePrice(MCITY, 30);
  assert.ok(r);
  assert.equal(r.amount, 70_000_000);
  assert.equal(r.basis, "exact");
  assert.equal(r.isEstimate, false);
  assert.equal(r.option?.id, "po-30");
});

test("D-04: 선형 환산은 실제 월가보다 43% 과다 — 편차 감지", () => {
  const deviation = linearMonthlyDeviation(MCITY);
  assert.ok(deviation != null);
  // (25,000,000 / 7 × 30 − 70,000,000) / 70,000,000 ≈ 0.531
  assert.ok(deviation > 0.4, `deviation=${deviation}`);
});

test("exact 매칭이면 추정 배지를 달지 않는다", () => {
  const r = resolvePrice(MCITY, 7);
  assert.equal(r?.amount, 25_000_000);
  assert.equal(r?.isEstimate, false);
  assert.equal(r?.note, undefined);
});

test("보간은 로그 스케일 — 선형 보간(현·chord)보다 위에 놓인다", () => {
  const r = resolvePrice(MCITY, 14);
  assert.ok(r);
  assert.equal(r.basis, "interpolated");
  assert.equal(r.isEstimate, true);
  assert.ok(r.note?.includes("보간"));

  // 가격은 일수에 대해 concave(증가·체감)하므로 실제 곡선은 두 상품을 잇는
  // 직선(chord) **위**에 있다. 선형 보간은 중간 기간을 과소 산정한다.
  const linearChord =
    25_000_000 + ((14 - 7) / (15 - 7)) * (45_000_000 - 25_000_000);
  assert.ok(r.amount > linearChord, `log=${r.amount} linear=${linearChord}`);
  // 그래도 구간 밖으로는 나가지 않는다
  assert.ok(r.amount > 25_000_000 && r.amount < 45_000_000);
});

test("보간값은 일할 단가가 단조 감소하는 방향을 유지한다", () => {
  const perDay = [7, 10, 14, 15, 22, 30].map((d) => {
    const r = resolvePrice(MCITY, d);
    assert.ok(r);
    return r.amount / d;
  });
  for (let i = 1; i < perDay.length; i += 1) {
    assert.ok(
      perDay[i] <= perDay[i - 1] + 1,
      `일할 단가가 반등: ${perDay[i - 1]} → ${perDay[i]}`,
    );
  }
});

test("최장 상품 초과 — 장기 할인 적용 + 추정 표기", () => {
  const r = resolvePrice(MCITY, 90);
  assert.ok(r);
  assert.equal(r.basis, "extrapolated");
  assert.equal(r.isEstimate, true);
  // (70,000,000 / 30) × 90 × 0.85
  assert.equal(r.amount, 178_500_000);
  assert.ok(r.amount < (70_000_000 / 30) * 90);
});

test("최단 상품보다 짧은 기간은 최단 상품가를 받는다 (일할 축소 금지)", () => {
  const r = resolvePrice(MCITY, 3);
  assert.ok(r);
  assert.equal(r.amount, 25_000_000);
  assert.equal(r.isEstimate, true);
  assert.ok(r.note?.includes("최소 판매 단위"));
});

test("가격 옵션이 없으면 null — 0원 견적을 만들지 않는다", () => {
  assert.equal(resolvePrice([], 30), null);
  assert.equal(resolvePrice(MCITY, 0), null);
});
