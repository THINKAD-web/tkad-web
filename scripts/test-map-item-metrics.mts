/**
 * Map list CPM / reach label formatting.
 * Run: npx tsx scripts/test-map-item-metrics.mts
 */
import assert from "node:assert/strict";
import {
  formatMapCpm,
  formatMapImpressions,
} from "../lib/media-map/map-item-metrics.ts";
import type { MapMapItem } from "../components/media-map/media-map-types.ts";

const base: MapMapItem = {
  id: "test-1",
  name: "Test",
  location: "Seoul",
  region: "seoul",
  type: "digital",
  price: 1_000_000,
  pricePeriod: "month",
  lat: 37.5,
  lng: 127,
  image: null,
  visibilityScore: 80,
  dailyFootTraffic: 150_000,
  impressions: null,
  cpm: null,
  isVerified: false,
  isInstantBooking: false,
};

// CPM must use won-scale formatter, not 만원 compact (150원 not ₩0만)
const cpm = formatMapCpm(base, "ko-KR");
assert.ok(cpm, "CPM should render");
assert.match(cpm!, /₩222/, `expected ~₩222 CPM, got ${cpm}`);

// Sub-₩1 CPM rounds to zero → em dash, not misleading ₩0만
const lowCpmItem: MapMapItem = {
  ...base,
  price: 50_000,
  dailyFootTraffic: 5_000_000,
};
const lowCpm = formatMapCpm(lowCpmItem, "ko-KR");
assert.equal(lowCpm, "—", `sub-₩1 CPM should show dash, got ${lowCpm}`);

const midCpmItem: MapMapItem = { ...base, price: 300_000, dailyFootTraffic: 100_000 };
const midCpm = formatMapCpm(midCpmItem, "ko-KR");
assert.match(midCpm!, /₩100/, `expected ~₩100 CPM, got ${midCpm}`);

const monthly = formatMapImpressions(base, true);
assert.equal(monthly, "4.5M", `monthly reach label, got ${monthly}`);

console.log("test-map-item-metrics.mts: all passed");
