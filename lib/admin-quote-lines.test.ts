import assert from "node:assert/strict";
import test from "node:test";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import {
  buildAdminQuoteLineItems,
  computeAdminCatalogLineAmount,
  computeAdminCatalogLineAmountForMedia,
  createCustomQuoteLine,
  type AdminQuoteCatalogLine,
} from "@/lib/admin-quote-lines";
import { catalogPriceFieldToWon, monthFactorFromDays } from "@/lib/pricing";

const busMedia = {
  id: "bus-seoul",
  name: "서울시내버스",
  nameEn: "Seoul Bus",
  location: "서울",
  region: "서울",
  type: "버스",
  price: 1200000,
  priceOptions: [
    { label: "SSA", price: 1500000, period: "month" },
    { label: "A", price: 1200000, period: "month" },
  ],
  image: null,
  latitude: null,
  longitude: null,
  dailyFootfall: null,
  visibilityScore: 0,
  width: null,
  height: null,
  resolution: null,
  operatingHours: null,
  extractedImages: [],
} as AdminMediaDto;

function factorForPeriod(p: "month" | "biweekly" | "week" | "day", d: number) {
  if (p === "day") return d;
  if (p === "week") return d / 7;
  if (p === "biweekly") return d / 14;
  return monthFactorFromDays(d);
}

test("computeAdminCatalogLineAmount matches legacy single-line formula", () => {
  const days = 30;
  const rawPrice = 1200000;
  const unitWon = catalogPriceFieldToWon(rawPrice);
  const legacy = Math.round(unitWon * monthFactorFromDays(days) * 1);
  const next = computeAdminCatalogLineAmount(
    rawPrice,
    "month",
    days,
    1,
    factorForPeriod,
  );
  assert.equal(next, legacy);
});

test("buildAdminQuoteLineItems SSA 40대 amount = 150만×40", () => {
  const days = 30;
  const line: AdminQuoteCatalogLine = {
    kind: "catalog",
    lineId: "l1",
    mediaId: "bus-seoul",
    priceOptionIndex: 0,
    quantity: 40,
  };
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [busMedia],
    isKo: true,
    campaignPeriodLabel: "2026-07-01 ~ 2026-07-30",
    days,
    factorForPeriod,
  });
  assert.equal(items.length, 1);
  const expected = Math.round(catalogPriceFieldToWon(1_500_000) * 40);
  assert.equal(items[0]?.amount, expected);
  assert.equal(items[0]?.quantity, 40);
});

test("buildAdminQuoteLineItems single catalog line amount regression", () => {
  const days = 30;
  const line: AdminQuoteCatalogLine = {
    kind: "catalog",
    lineId: "l1",
    mediaId: "bus-seoul",
    priceOptionIndex: 1,
    quantity: 20,
  };
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [busMedia],
    isKo: true,
    campaignPeriodLabel: "2026-07-01 ~ 2026-07-30",
    days,
    factorForPeriod,
  });
  assert.equal(items.length, 1);
  const rawPrice = 1200000;
  const unitWon = catalogPriceFieldToWon(rawPrice);
  const expected = Math.round(unitWon * monthFactorFromDays(days) * 20);
  assert.equal(items[0]?.amount, expected);
  assert.equal(items[0]?.mediaName, "서울시내버스 (A)");
  assert.equal(items[0]?.quantity, 20);
});

const monthlyMedia = {
  ...busMedia,
  id: "dig-monthly",
  name: "월단가 디지털",
  price: 10_000_000,
  priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
  partialPeriodRates: { "2weeks": 0.6 },
} as AdminMediaDto;

test("computeAdminCatalogLineAmountForMedia applies 2weeks 60% override", () => {
  const { amount, usesMediaPartialRate } = computeAdminCatalogLineAmountForMedia(
    monthlyMedia,
    0,
    14,
    1,
    factorForPeriod,
  );
  assert.equal(usesMediaPartialRate, true);
  assert.equal(amount, 6_000_000);
});

test("buildAdminQuoteLineItems sets usesMediaPartialRate for 14-day campaign", () => {
  const line: AdminQuoteCatalogLine = {
    kind: "catalog",
    lineId: "l-partial",
    mediaId: "dig-monthly",
    priceOptionIndex: 0,
    quantity: 1,
  };
  const items = buildAdminQuoteLineItems({
    lines: [line],
    medias: [monthlyMedia],
    isKo: true,
    campaignPeriodLabel: "2026-07-01 ~ 2026-07-14",
    days: 14,
    factorForPeriod,
  });
  assert.equal(items[0]?.amount, 6_000_000);
  assert.equal(items[0]?.usesMediaPartialRate, true);
});

test("buildAdminQuoteLineItems custom line unchanged (manual amount)", () => {
  const items = buildAdminQuoteLineItems({
    lines: [
      createCustomQuoteLine({
        name: "제작비",
        quantity: 2,
        unitPriceWon: 500_000,
      }),
    ],
    medias: [],
    isKo: true,
    campaignPeriodLabel: "2026-07-01 ~ 2026-07-14",
    days: 14,
    factorForPeriod,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.amount, 1_000_000);
  assert.equal(items[0]?.usesMediaPartialRate, undefined);
});

test("no partial rate — 30-day monthFactor regression", () => {
  const plain = {
    ...monthlyMedia,
    id: "dig-plain",
    partialPeriodRates: null,
  } as AdminMediaDto;
  const { amount, usesMediaPartialRate } = computeAdminCatalogLineAmountForMedia(
    plain,
    0,
    30,
    1,
    factorForPeriod,
  );
  assert.equal(usesMediaPartialRate, false);
  assert.equal(
    amount,
    computeAdminCatalogLineAmount(10_000_000, "month", 30, 1, factorForPeriod),
  );
});
