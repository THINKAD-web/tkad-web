import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data.ts";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map.ts";
import {
  mediaDisplayCpmSourceFromItem,
  resolveCpmWonForDisplay,
  resolveCpmWonForDisplayFromMediaItem,
  resolveMonthlyImpressions,
} from "@/lib/media-metrics.ts";
import { MODEL_VERSIONS } from "@/lib/media/engine/constants.ts";
import { serializeMapApiItemFromMediaItem } from "./serialize-map-api-item.ts";

function baseMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "test-media",
    slug: "test-media",
    name: "테스트 매체",
    nameEn: "Test",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "dooh",
    price: 50_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 100_000,
    sampleImages: [],
    ...over,
  };
}

test("map API item — CPM·월노출 matches list catalog path (engine v1)", () => {
  const m = baseMedia({
    computedMetric: {
      dailyImpressions: 317_678,
      modelVersion: MODEL_VERSIONS.V1_IMPRESSIONS,
    },
  });
  const mapItem = serializeMapApiItemFromMediaItem(m, "pin", undefined);
  const listCpm = resolveCpmWonForDisplayFromMediaItem(m);
  const mapCpm = resolveCpmWonForDisplay(mapItem);
  assert.equal(mapCpm, listCpm);

  const listSource = mediaDisplayCpmSourceFromItem(m);
  assert.equal(mapCpm, resolveCpmWonForDisplay(listSource));

  const mapMonthly = resolveMonthlyImpressions(mapItem);
  const listMonthly = resolveMonthlyImpressions(listSource);
  assert.equal(mapMonthly, listMonthly);
});

test("map API item — 0.5구좌 display price option parity", () => {
  const m = baseMedia({
    price: 100_000_000,
    pricePeriod: "month",
    priceOptions: [
      { price: 100_000_000, period: "month", label: "1구좌" },
      { price: 80_000_000, period: "month", label: "0.5구좌" },
    ],
    impressions: 4_500_000,
    cpm: 22_222,
  });
  const mapItem = serializeMapApiItemFromMediaItem(m, "pin", undefined);
  assert.equal(
    resolveCpmWonForDisplay(mapItem),
    resolveCpmWonForDisplayFromMediaItem(m),
  );
});

test("map API item — fallback impressions path parity", () => {
  const m = baseMedia({
    impressions: 1_900_000,
    dailyFootTraffic: 50_000,
    computedMetric: undefined,
  });
  const mapItem = serializeMapApiItemFromMediaItem(m, "pin", undefined);
  assert.equal(
    resolveMonthlyImpressions(mapItem),
    resolveMonthlyImpressions(mediaDisplayCpmSourceFromItem(m)),
  );
});
