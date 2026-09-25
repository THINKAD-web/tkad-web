import assert from "node:assert/strict";
import { buildMapListSections } from "@/lib/media-map/split-map-list-sections";
import type { MapMapItem } from "@/components/media-map/media-map-types";

const pinIn: MapMapItem = {
  id: "a",
  name: "A",
  location: "",
  region: "seoul",
  city: null,
  district: null,
  type: "dooh",
  subCategory: null,
  price: 1,
  pricePeriod: "month",
  catalogPrice: 1,
  catalogPricePeriod: "month",
  createdAt: null,
  lat: 37.5,
  lng: 127.0,
  image: null,
  availability: null,
  visibilityScore: 1,
  mapDisplayMode: "pin",
};

const mobile: MapMapItem = {
  ...pinIn,
  id: "b",
  mapDisplayMode: "service_region",
  lat: 0,
  lng: 0,
};

const bounds = { swLat: 37, neLat: 38, swLng: 126.5, neLng: 127.5 };
const sections = buildMapListSections([pinIn, mobile], bounds, true);
assert.equal(sections.length, 2);
assert.equal(sections[0]?.id, "viewport");
assert.equal(sections[0]?.items.length, 1);
assert.equal(sections[1]?.id, "national");

console.log("split-map-list-sections.test.ts: ok");
