import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMediaDetailQuoteHref,
  flightDatesToCampaignDays,
} from "@/lib/media-detail-quantity";
import type { MediaItem } from "@/lib/media-data";
import {
  inclusiveCampaignDaysFromIso,
  nearestQuoteCampaignPeriodKey,
  parseCampaignDaysParam,
  resolveQuoteCampaignDaysFromParams,
} from "@/lib/quote-campaign-days";
import { resolveQuoteUnitsForPriceOption } from "@/lib/quote-entry-quantity";
import { buildQuoteWizardLineContext } from "@/lib/quote-wizard-pricing";

const bus: MediaItem = {
  id: "bus-1",
  name: "버스",
  nameEn: "Bus",
  location: "서울",
  locationEn: "Seoul",
  region: "서울",
  type: "버스",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  priceOptions: [
    { label: "SSA", price: 1_500_000, period: "month", units: 40 },
    { label: "A", price: 1_200_000, period: "month", units: 20 },
  ],
};

test("inclusiveCampaignDaysFromIso — 90 day range", () => {
  assert.equal(
    inclusiveCampaignDaysFromIso("2026-01-01", "2026-03-31"),
    90,
  );
});

test("resolveQuoteCampaignDaysFromParams prefers start+end", () => {
  const r = resolveQuoteCampaignDaysFromParams({
    campaignDaysRaw: "30",
    startRaw: "2026-01-01",
    endRaw: "2026-03-31",
  });
  assert.equal(r.campaignDays, 90);
  assert.equal(r.flightStart, "2026-01-01");
});

test("buildMediaDetailQuoteHref encodes campaignDays and flight dates", () => {
  const href = buildMediaDetailQuoteHref(bus, {
    campaignDays: 90,
    flightStart: "2026-01-01",
    flightEnd: "2026-03-31",
    period: "30days",
  });
  assert.match(href, /campaignDays=90/);
  assert.match(href, /start=2026-01-01/);
  assert.match(href, /end=2026-03-31/);
});

test("flightDatesToCampaignDays", () => {
  assert.equal(
    flightDatesToCampaignDays("2026-01-01", "2026-01-31"),
    31,
  );
  assert.equal(flightDatesToCampaignDays("", "2026-01-31"), null);
});

test("nearestQuoteCampaignPeriodKey — 90 days snaps to 30days preset", () => {
  assert.equal(nearestQuoteCampaignPeriodKey(90), "30days");
});

test("buildQuoteWizardLineContext uses campaignDaysOverride for monthly media", () => {
  const monthly: MediaItem = {
    ...bus,
    id: "bb-1",
    type: "digital",
    price: 30_000_000,
    priceOptions: [],
    pricePeriod: "month",
  };
  const thirty = buildQuoteWizardLineContext(monthly, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
    campaignDaysOverride: 90,
  });
  const baseline = buildQuoteWizardLineContext(monthly, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30일",
    priceOptionIndex: 0,
  });
  assert.equal(thirty.campaignDays, 90);
  assert.equal(thirty.lineTotalMan, baseline.lineTotalMan * 3);
});

test("resolveQuoteUnitsForPriceOption — grade bus A tier", () => {
  assert.equal(resolveQuoteUnitsForPriceOption(bus, 1), 20);
  assert.equal(resolveQuoteUnitsForPriceOption(bus, 0), 40);
});

test("parseCampaignDaysParam rejects invalid", () => {
  assert.equal(parseCampaignDaysParam(null), null);
  assert.equal(parseCampaignDaysParam("0"), null);
  assert.equal(parseCampaignDaysParam("45"), 45);
});
