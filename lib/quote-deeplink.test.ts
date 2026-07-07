import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  buildQuoteDeeplinkPath,
  parseQuotePoMap,
  parseQuoteUnitsMap,
} from "@/lib/quote-deeplink";

function mobile(id: string): MediaItem {
  return {
    id,
    name: "Taxi",
    nameEn: "Taxi",
    location: "Seoul",
    locationEn: "Seoul",
    region: "seoul",
    type: "mobile",
    price: 3_000_000,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 1000,
  };
}

test("buildQuoteDeeplinkPath single mobile units", () => {
  const m = mobile("bus-1");
  const path = buildQuoteDeeplinkPath([m], { quantities: { "bus-1": 5 } });
  assert.match(path, /media=bus-1/);
  assert.match(path, /units=5/);
});

test("buildQuoteDeeplinkPath multi unitsMap", () => {
  const a = mobile("a");
  const b = mobile("b");
  const path = buildQuoteDeeplinkPath([a, b], {
    quantities: { a: 3, b: 7 },
  });
  assert.match(path, /unitsMap=a%3A3%2Cb%3A7|unitsMap=a:3,b:7/);
});

test("parseQuoteUnitsMap roundtrip", () => {
  assert.deepEqual(parseQuoteUnitsMap("a:3,b:7"), { a: 3, b: 7 });
});

test("parseQuotePoMap", () => {
  assert.deepEqual(parseQuotePoMap("x:2,y:0"), { x: 2, y: 0 });
});
