import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMediaDetailPlannerHref,
  buildMediaDetailQuoteHref,
  calculateMediaDetailQuote,
  shouldShowMediaDetailQuantityControl,
} from "@/lib/media-detail-quantity";
import type { MediaItem } from "@/lib/media-data";

const mobileBus: MediaItem = {
  id: "bus-1",
  name: "버스",
  nameEn: "Bus",
  location: "서울",
  locationEn: "Seoul",
  region: "서울",
  type: "mobile",
  price: 3_000_000,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 500,
  sampleImages: [],
};

const fixedBillboard: MediaItem = {
  ...mobileBus,
  id: "bb-1",
  name: "빌보드",
  type: "digital",
};

test("shouldShowMediaDetailQuantityControl — mobile yes, fixed no", () => {
  assert.equal(shouldShowMediaDetailQuantityControl(mobileBus), true);
  assert.equal(shouldShowMediaDetailQuantityControl(fixedBillboard), false);
});

test("calculateMediaDetailQuote scales mobile units", () => {
  const one = calculateMediaDetailQuote(mobileBus, 30, { units: 1 });
  const three = calculateMediaDetailQuote(mobileBus, 30, { units: 3 });
  assert.equal(three.costWon, one.costWon * 3);
});

test("detail hrefs pass units query", () => {
  assert.match(buildMediaDetailQuoteHref(mobileBus, { units: 5 }), /units=5/);
  assert.match(buildMediaDetailPlannerHref("bus-1", 5), /units=5/);
  assert.equal(buildMediaDetailPlannerHref("bus-1", 1), "/planner?addMedia=bus-1");
});
