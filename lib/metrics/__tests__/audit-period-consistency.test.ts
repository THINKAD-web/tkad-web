import assert from "node:assert/strict";
import test from "node:test";
import {
  auditRow,
  createAccumulator,
  type AuditMediaRow,
} from "../audit-rules";
import { evaluateR03PeriodConversion } from "../r03-period-audit";
import {
  isFrequencyPlaybackLabel,
  parseBillingPeriodDays,
  parseLabelDays,
} from "../label-parse";

function row(overrides: Partial<AuditMediaRow> = {}): AuditMediaRow {
  return {
    id: "cmtest0001",
    slug: null,
    name: "테스트 매체",
    type: "static",
    region: "서울",
    regionMain: "서울",
    location: "서울 중구",
    description: null,
    price: 5_000_000,
    pricePeriod: "month",
    priceOptions: null,
    priceNote: null,
    widthM: null,
    heightM: null,
    resolution: null,
    targetAge: null,
    dailyFootfall: 50_000,
    impressions: null,
    cpm: null,
    mediaMainCategory: "ooh",
    mediaSubCategory: "billboard",
    latitude: 37.5,
    tags: [],
    nearbyStations: null,
    nearbyLandmarks: null,
    ...overrides,
  };
}

// ── label-parse / R-05b ───────────────────────────────────────

test("parseLabelDays — 결제 주기만 (일/주/개월)", () => {
  assert.equal(parseLabelDays("7일"), 7);
  assert.equal(parseLabelDays("1개월"), 30);
  assert.equal(parseLabelDays("2주"), 14);
  assert.equal(parseLabelDays("1 week"), 7);
  assert.equal(parseLabelDays("20초 기준"), null);
  assert.equal(parseLabelDays(null), null);
});

test("parseLabelDays — 재생 빈도 (1일 N회) 는 null", () => {
  assert.equal(parseLabelDays("20초 (1일 100회)"), null);
  assert.equal(parseLabelDays("1일 100회"), null);
  assert.ok(isFrequencyPlaybackLabel("20초 (1일 100회)"));
});

test("parseLabelDays — relabel 패턴 1개월 · 20초", () => {
  assert.equal(parseLabelDays("1개월 · 20초 (1일 100회)"), 30);
  assert.equal(parseBillingPeriodDays("1개월 · 20초"), 30);
});

test('R-05b: "1개월 · 20초" + period=month — 오탐 없음', () => {
  const acc = createAccumulator();
  auditRow(
    row({
      priceOptions: [
        {
          label: "1개월 · 20초 (1일 100회)",
          price: 4_000_000,
          period: "month",
        },
      ],
    }),
    acc,
  );
  const r05b = acc.violations.filter(
    (v) => v.rule === "R-05" && v.detail?.optionIdx === 0,
  );
  assert.equal(r05b.length, 0);
});

test('R-05b: "1개월" + period=day — 여전히 위반', () => {
  const acc = createAccumulator();
  auditRow(
    row({
      priceOptions: [{ label: "1개월", price: 70_000_000, period: "day" }],
    }),
    acc,
  );
  const hit = acc.violations.find(
    (v) => v.rule === "R-05" && v.detail?.labelDays === 30,
  );
  assert.ok(hit);
});

// ── R-03 engine-aligned ───────────────────────────────────────

test("R-03: tier 할인 ladder (7·30일) — 오탐 없음", () => {
  const mcity = row({
    price: 70_000_000,
    pricePeriod: "month",
    priceOptions: [
      { label: "7일", price: 25_000_000, period: "week" },
      { label: "15일", price: 45_000_000, period: "biweekly", periodDays: 15 },
      { label: "1개월", price: 70_000_000, period: "month" },
    ],
  });
  const r03 = evaluateR03PeriodConversion(mcity);
  assert.equal(r03.violation, false);
  assert.equal(r03.proxy, "tier_discount_ok");
});

test("R-03: 2주+1개월 tier ladder — 오탐 없음", () => {
  const r03 = evaluateR03PeriodConversion(
    row({
      price: 4_000_000,
      pricePeriod: "month",
      priceOptions: [
        { label: "1개월", price: 4_000_000, period: "month" },
        { label: "2주", price: 2_300_000, period: "biweekly" },
      ],
    }),
  );
  assert.equal(r03.violation, false);
});

test("R-03: day tier + month package — Track 패턴 유지", () => {
  const r03 = evaluateR03PeriodConversion(
    row({
      price: 500_000,
      pricePeriod: "month",
      priceOptions: [
        { label: "1개월", price: 500_000, period: "month" },
        { label: "단기 10일", price: 100_000, period: "day" },
      ],
    }),
  );
  assert.equal(r03.violation, true);
  assert.equal(r03.proxy, "day_tier_with_package");
});

test("R-03: 시즌별 동일 30일 bucket — 위반 유지", () => {
  const r03 = evaluateR03PeriodConversion(
    row({
      price: 100_000_000,
      pricePeriod: "month",
      priceOptions: [
        { label: "1~10월", price: 100_000_000, period: "month" },
        { label: "11~12월", price: 200_000_000, period: "month" },
        { label: "1일 라이브", price: 22_000_000, period: "day" },
      ],
    }),
  );
  assert.equal(r03.violation, true);
});

test("R-03: base-only day/week risky — 여전히 위반", () => {
  const r03 = evaluateR03PeriodConversion(
    row({
      price: 70_000_000,
      pricePeriod: "day",
      priceOptions: [],
    }),
  );
  assert.equal(r03.violation, true);
  assert.equal(r03.proxy, "base_only_risky");
});
