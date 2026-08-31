import assert from "node:assert/strict";
import test from "node:test";
import {
  periodToDays,
  readCustomPeriodDays,
  resolveOptionDays,
  resolvePrice,
} from "../price";
import { mediaPriceOptions } from "../media-price-adapter";
import type { MediaPriceSource } from "../media-price-adapter";
import type { PriceOption } from "../types";

test("resolveOptionDays — custom 없으면 periodToDays 와 동일", () => {
  assert.equal(resolveOptionDays("month"), 30);
  assert.equal(resolveOptionDays("month", null), 30);
  assert.equal(resolveOptionDays("month", undefined), 30);
  assert.equal(resolveOptionDays("biweekly"), 14);
  assert.equal(resolveOptionDays("quarter"), null);
});

test("resolveOptionDays — periodDays 가 enum 보다 우선", () => {
  assert.equal(resolveOptionDays("month", 28), 28);
  assert.equal(resolveOptionDays("day", 10), 10);
  assert.equal(resolveOptionDays("month", 180), 180);
});

test("readCustomPeriodDays — 유효 범위만", () => {
  assert.equal(readCustomPeriodDays(28), 28);
  assert.equal(readCustomPeriodDays(28.7), 29);
  assert.equal(readCustomPeriodDays(0), null);
  assert.equal(readCustomPeriodDays(-1), null);
  assert.equal(readCustomPeriodDays("28"), null);
});

/** 회귀 — periodDays 없는 기존 매체 스냅샷 (M-CITY 패턴) */
const LEGACY_MCITY: MediaPriceSource = {
  price: 70_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "7일", price: 25_000_000, period: "week" },
    { label: "15일", price: 45_000_000, period: "biweekly" },
    { label: "1개월", price: 70_000_000, period: "month" },
  ],
};

const LEGACY_SNAPSHOT: PriceOption[] = [
  { days: 7, price: 25_000_000, id: "po-0", label: "7일" },
  { days: 14, price: 45_000_000, id: "po-1", label: "15일" },
  { days: 30, price: 70_000_000, id: "po-2", label: "1개월" },
];

test("mediaPriceOptions — periodDays 없으면 기존 결과와 동일 (M-CITY)", () => {
  const opts = mediaPriceOptions(LEGACY_MCITY);
  assert.deepEqual(
    opts.map((o) => ({ days: o.days, price: o.price, id: o.id })),
    LEGACY_SNAPSHOT.map((o) => ({ days: o.days, price: o.price, id: o.id })),
  );
  const r30 = resolvePrice(opts, 30);
  assert.equal(r30?.amount, 70_000_000);
  assert.equal(r30?.basis, "exact");
});

test("mediaPriceOptions — periodDays 설정 시에만 days 변경", () => {
  const withCustom: MediaPriceSource = {
    ...LEGACY_MCITY,
    priceOptions: [
      { label: "4주", price: 40_000_000, period: "month", periodDays: 28 },
      { label: "2주", price: 25_000_000, period: "biweekly" },
    ],
  };
  const opts = mediaPriceOptions(withCustom);
  const fourWeeks = opts.find((o) => o.id === "po-0");
  assert.equal(fourWeeks?.days, 28);
  const twoWeeks = opts.find((o) => o.id === "po-1");
  assert.equal(twoWeeks?.days, 14);

  const r28 = resolvePrice(opts, 28);
  assert.equal(r28?.amount, 40_000_000);
  assert.equal(r28?.basis, "exact");
});

test("mediaPriceOptions — base pricePeriodDays 우선", () => {
  const baseCustom: MediaPriceSource = {
    price: 5_000_000,
    pricePeriod: "month",
    pricePeriodDays: 120,
    priceOptions: [],
  };
  const opts = mediaPriceOptions(baseCustom);
  assert.equal(opts.length, 1);
  assert.equal(opts[0]?.days, 120);
});
