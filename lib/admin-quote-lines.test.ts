import assert from "node:assert/strict";
import test from "node:test";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import {
  buildAdminQuoteLineItems,
  computeAdminCatalogLineAmount,
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
