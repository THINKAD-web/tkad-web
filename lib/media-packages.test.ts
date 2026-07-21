import assert from "node:assert/strict";
import test from "node:test";
import { resolveMediaPackage } from "./media-packages.ts";
import type { MediaPackageDefinition } from "@/data/packages";
import type { MediaItem } from "./media-data.ts";
import { resolveMonthlyListPriceWon } from "./media-metrics.ts";

const dayMedia = {
  id: "day-board",
  name: "일 단가 매체",
  price: 22_000_000,
  pricePeriod: "day",
  type: "digital",
  region: "seoul",
} as MediaItem;

const monthMedia = {
  id: "month-board",
  name: "월 단가 매체",
  price: 50_000_000,
  pricePeriod: "month",
  type: "digital",
  region: "seoul",
} as MediaItem;

const multiOpt = {
  id: "multi-opt",
  name: "옵션 매체",
  price: 110_000_000,
  pricePeriod: "month",
  priceOptions: [
    { label: "일", price: 22_000_000, period: "day" },
    { label: "월", price: 110_000_000, period: "month" },
  ],
  type: "digital",
  region: "seoul",
} as MediaItem;

const pkgDef = {
  slug: "test-pack",
  name: "테스트 패키지",
  nameEn: "Test pack",
  summary: "test",
  summaryEn: "test",
  description: "test",
  descriptionEn: "test",
  mediaIds: ["day-board", "month-board", "multi-opt"],
  sortOrder: 1,
  accent: "orange",
  industries: [],
} as unknown as MediaPackageDefinition;

test("bug #3: day-rate media monthly-converts in package price range", () => {
  const resolved = resolveMediaPackage(pkgDef, [dayMedia, monthMedia, multiOpt]);
  const dayMonthly = resolveMonthlyListPriceWon(dayMedia);
  assert.equal(dayMonthly, 22_000_000 * 30);
  assert.equal(resolved.priceRangeWon.min, Math.min(
    dayMonthly,
    resolveMonthlyListPriceWon(monthMedia),
    resolveMonthlyListPriceWon(multiOpt),
  ));
  // multi-opt cheapest day → 660M; dayMedia 660M; month 50M → min 50M
  assert.equal(resolved.priceRangeWon.min, 50_000_000);
  // max = sum of monthly equivalents
  assert.equal(
    resolved.priceRangeWon.max,
    dayMonthly + 50_000_000 + resolveMonthlyListPriceWon(multiOpt),
  );
});

test("bug #3: month-only package range unchanged vs list SSOT", () => {
  const onlyMonth = {
    ...pkgDef,
    mediaIds: ["month-board"],
  } as unknown as MediaPackageDefinition;
  const resolved = resolveMediaPackage(onlyMonth, [monthMedia]);
  assert.equal(resolved.priceRangeWon.min, 50_000_000);
  assert.equal(resolved.priceRangeWon.max, 50_000_000);
  assert.match(resolved.priceRangeLabelKo, /월/);
});

test("bug #3: legacy raw cheapest would understate day media vs SSOT", () => {
  // Before fix: cheapest raw 22M counted as "monthly" in range
  // After: 660M
  assert.equal(resolveMonthlyListPriceWon(dayMedia), 660_000_000);
  assert.notEqual(dayMedia.price, resolveMonthlyListPriceWon(dayMedia));
});
