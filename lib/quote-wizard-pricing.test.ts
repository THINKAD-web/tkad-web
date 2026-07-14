import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  buildQuoteWizardLineContext,
  quoteCatalogDisplayPriceMan,
  quoteCampaignUnits,
} from "@/lib/quote-wizard-pricing";
import { calculateMediaQuoteFromOption } from "@/lib/compare-quote";

function busItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "bus-1",
    name: "서울버스",
    nameEn: "Seoul Bus",
    location: "서울",
    locationEn: "Seoul",
    region: "서울",
    type: "버스",
    price: 800_000,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 500,
    sampleImages: [],
    priceOptions: [
      { label: "A", price: 800_000, period: "month" },
      { label: "SSA", price: 900_000, period: "month" },
    ],
    ...overrides,
  };
}

test("grade bus: line total = unit rate × fleet count (80만×1 + 80만×50 = 4080만)", () => {
  const seoul = busItem({ id: "bus-seoul" });
  const city = busItem({
    id: "bus-city",
    name: "시내버스",
    priceOptions: [{ label: "SSA", price: 800_000, period: "month" }],
  });

  const line1 = buildQuoteWizardLineContext(seoul, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 1,
  });
  const line2 = buildQuoteWizardLineContext(city, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 50,
  });

  assert.equal(line1.lineTotalMan, 80);
  assert.equal(line2.lineTotalMan, 4000);
  assert.equal(line1.lineTotalMan + line2.lineTotalMan, 4080);
});

test("170만 regression: fixed total differs from summing option rates without fleet", () => {
  const seoul = busItem({ id: "bus-seoul" });
  const city = busItem({
    id: "bus-city",
    priceOptions: [{ label: "SSA", price: 800_000, period: "month" }],
  });

  const legacyWrongTotal = 80 + 80;
  const line1 = buildQuoteWizardLineContext(seoul, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 1,
  });
  const line2 = buildQuoteWizardLineContext(city, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 50,
  });
  const fixedTotal = line1.lineTotalMan + line2.lineTotalMan;
  assert.equal(fixedTotal, 4080);
  assert.notEqual(fixedTotal, legacyWrongTotal);
  assert.notEqual(fixedTotal, 170);
});

test("SSA 40대 · A 20대 admin parity", () => {
  const bus = busItem({
    priceOptions: [
      { label: "SSA", price: 1_500_000, period: "month", units: 40 },
      { label: "A", price: 1_200_000, period: "month", units: 20 },
    ],
  });

  const ssa = buildQuoteWizardLineContext(bus, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 40,
  });
  const a = buildQuoteWizardLineContext(bus, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 1,
    mobileUnits: 20,
  });

  assert.equal(ssa.lineTotalMan, 6000);
  assert.equal(a.lineTotalMan, 2400);
});

test("quoteCatalogDisplayPriceMan matches line unit for grade bus", () => {
  const bus = busItem();
  const display = quoteCatalogDisplayPriceMan(bus, {
    priceOptionIndex: 0,
    mobileUnits: 50,
  });
  const line = buildQuoteWizardLineContext(bus, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    mobileUnits: 50,
  });
  assert.equal(display, line.unitPriceMan);
  assert.equal(display, 4000);
});

test("partial period rate override — 15days 60% on monthly media", () => {
  const media = busItem({
    price: 10_000_000,
    pricePeriod: "month",
    partialPeriodRates: { "15days": 0.6 },
    priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
  });

  const line = buildQuoteWizardLineContext(media, {
    isKo: true,
    campaignPeriod: "15days",
    campaignPeriodLabel: "15일",
    priceOptionIndex: 0,
  });

  assert.equal(line.lineTotalMan, 600);
  assert.equal(line.usesMediaPartialRate, true);
  assert.match(line.prorationLabel ?? "", /매체 지정 요율/);
});

test("partial period rate — no override keeps 50% for 15days monthly", () => {
  const media = busItem({
    price: 10_000_000,
    pricePeriod: "month",
    priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
  });

  const line = buildQuoteWizardLineContext(media, {
    isKo: true,
    campaignPeriod: "15days",
    campaignPeriodLabel: "15일",
    priceOptionIndex: 0,
  });

  assert.equal(line.usesMediaPartialRate, false);
  assert.equal(line.campaignUnits, quoteCampaignUnits("15days", "month"));
  assert.equal(line.lineTotalMan, 500);
});

test("compare calculateMediaQuoteFromOption applies option partial rate at 15 days", () => {
  const media = busItem({
    price: 10_000_000,
    pricePeriod: "month",
    priceOptions: [
      {
        label: "기본",
        price: 10_000_000,
        period: "month",
        partialPeriodRates: { "15days": 0.6 },
      },
    ],
  });

  const line = calculateMediaQuoteFromOption(
    media,
    media.priceOptions![0]!,
    15,
  );
  assert.equal(line.costWon, 6_000_000);
});

test("10-day campaign falls back to linear proration", () => {
  const media = busItem({
    price: 10_000_000,
    pricePeriod: "month",
    partialPeriodRates: { "15days": 0.6 },
    priceOptions: [{ label: "기본", price: 10_000_000, period: "month" }],
  });

  const line = calculateMediaQuoteFromOption(
    media,
    media.priceOptions![0]!,
    10,
  );
  assert.equal(line.costWon, Math.round(10_000_000 * (10 / 30)));
});
