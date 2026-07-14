import assert from "node:assert/strict";
import test from "node:test";
import type { PlanCartItem } from "@/lib/plan-cart";
import { planCartLinePeriodTotalWon } from "@/lib/plan-cart-pricing";
import type { MediaItem } from "@/lib/media-data";
import { buildQuoteWizardLineContext } from "@/lib/quote-wizard-pricing";
import {
  buildQuoteMediaSelectionSnapshotsFromCartItem,
  quoteOptionSelectionPeriodTotalWon,
} from "@/lib/quote-snapshot-build";

const ktxMedia: MediaItem = {
  id: "ktx-1",
  name: "KTX",
  nameEn: "KTX",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 22_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 100_000,
  sampleImages: [],
  partialPeriodRates: { "15days": 0.6 },
};

const plainMedia: MediaItem = {
  id: "plain-1",
  name: "Plain",
  nameEn: "Plain",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 3_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 50_000,
  sampleImages: [],
};

function cartItem(mediaId: string, price: number): PlanCartItem {
  return {
    mediaId,
    mediaName: mediaId,
    mediaType: "digital",
    region: "seoul",
    price,
    addedFrom: "planner",
    addedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("buildQuoteMediaSelectionSnapshotsFromCartItem — 1 week returns period total not monthly", () => {
  const periodCtx = { weeks: 1 };
  const item = cartItem(ktxMedia.id, 22_000_000);
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media: ktxMedia,
    item,
    isKo: true,
    periodCtx,
  });
  assert.equal(snaps.length, 1);
  assert.equal(snaps[0]!.lineTotalWon, 5_130_000);
  assert.notEqual(snaps[0]!.lineTotalWon, 22_000_000);
  assert.equal(
    snaps[0]!.lineTotalWon,
    planCartLinePeriodTotalWon(item, ktxMedia, periodCtx, true),
  );
});

test("buildQuoteMediaSelectionSnapshotsFromCartItem — 15-day override matches quote wizard", () => {
  const periodCtx = { months: 15 / 30 };
  const item = cartItem(ktxMedia.id, 22_000_000);
  const wizardLine = buildQuoteWizardLineContext(ktxMedia, {
    isKo: true,
    campaignPeriod: "15days",
    campaignPeriodLabel: "15일",
    priceOptionIndex: 0,
  });
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media: ktxMedia,
    item,
    isKo: true,
    periodCtx,
  });
  assert.equal(snaps[0]!.lineTotalWon, Math.round(wizardLine.lineTotalMan * 10_000));
  assert.equal(snaps[0]!.lineTotalWon, 13_200_000);
});

test("buildQuoteMediaSelectionSnapshotsFromCartItem — multi option rows sum to cart period total", () => {
  const busMedia: MediaItem = {
    id: "bus-a",
    name: "서울 버스 A등급",
    nameEn: "Seoul Bus A",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "mobile",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    priceOptions: [
      { label: "A", price: 800_000 },
      { label: "SSA", price: 1_200_000 },
    ],
  };
  const item: PlanCartItem = {
    ...cartItem(busMedia.id, 0),
    optionSelections: [
      { priceOptionIndex: 0, quantity: 2 },
      { priceOptionIndex: 1, quantity: 1 },
    ],
  };
  const periodCtx = { weeks: 4 };
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media: busMedia,
    item,
    isKo: true,
    periodCtx,
  });
  assert.equal(snaps.length, 2);
  const rowSum = snaps.reduce((s, snap) => s + snap.lineTotalWon, 0);
  assert.equal(rowSum, planCartLinePeriodTotalWon(item, busMedia, periodCtx, true));
  for (const snap of snaps) {
    const expected = quoteOptionSelectionPeriodTotalWon(
      busMedia,
      { priceOptionIndex: snap.priceOptionIndex, quantity: snap.quantity },
      periodCtx,
      true,
    );
    assert.equal(snap.lineTotalWon, expected);
    assert.notEqual(snap.lineTotalWon, 800_000);
  }
});

test("buildQuoteMediaSelectionSnapshotsFromCartItem — 1 month regression", () => {
  const periodCtx = { months: 1 };
  const item = cartItem(plainMedia.id, 3_000_000);
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media: plainMedia,
    item,
    isKo: true,
    periodCtx,
  });
  assert.equal(snaps[0]!.lineTotalWon, 3_000_000);
});
