import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  catalogMonthlyReferenceCpm,
  computeSeoulTypeBenchmarks,
  seoulCpmBenchmarkBadgeForMedia,
} from "@/lib/planner/seoul-media-benchmark";

/** 케이팝스퀘어형 — 표시가 80M / stored 4.5M (v0 footfall mirror 아님) */
const kpopLike = (): MediaItem =>
  ({
    id: "kpop-sample",
    name: "코엑스 케이팝 스퀘어 전광판 광고",
    nameEn: "K-pop square",
    location: "강남",
    locationEn: "Gangnam",
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
    price: 100_000_000,
    pricePeriod: "month",
    priceOptions: [
      { label: "1구좌", price: 100_000_000, period: "month" },
      { label: "0.5구좌", price: 80_000_000, period: "month" },
    ],
    impressions: 4_500_000,
    dailyFootTraffic: 150_000,
    cpm: 22_222,
    lat: 0,
    lng: 0,
    sampleImages: [],
    computedMetric: {
      dailyImpressions: 150_000,
      modelVersion: "v0-fallback",
    },
  }) as MediaItem;

test("catalogMonthlyReferenceCpm uses display CPM (kpop ≈ 17,778 not 22,222)", () => {
  const ref = catalogMonthlyReferenceCpm(kpopLike());
  assert.ok(ref);
  assert.equal(ref.cpm, 17_778);
});

test("seoulCpmBenchmarkBadgeForMedia returns null for DOOH kpop bucket", () => {
  const badge = seoulCpmBenchmarkBadgeForMedia(kpopLike(), [kpopLike()], true);
  assert.equal(badge, null);
});

test("subway bucket gets compare badge when nCpm sufficient", () => {
  const catalog = Array.from({ length: 6 }, (_, i) =>
    ({
      id: `sub-${i}`,
      name: `지하철 ${i}`,
      nameEn: `sub ${i}`,
      location: "서울",
      locationEn: "Seoul",
      region: "seoul",
      regionMain: "seoul",
      type: "digital",
      mediaSubCategory: "subway_station",
      subCategory: "subway_station",
      price: 12_000_000,
      pricePeriod: "month",
      impressions: 1_800_000,
      dailyFootTraffic: 60_000,
      lat: 0,
      lng: 0,
      sampleImages: [],
    }) as MediaItem,
  );
  const target = {
    ...catalog[0]!,
    id: "target-sub",
    price: 6_000_000,
    impressions: 1_800_000,
  };
  const stats = computeSeoulTypeBenchmarks([...catalog, target]);
  assert.ok(stats.subway.cpmComparable);
  const badge = seoulCpmBenchmarkBadgeForMedia(
    target,
    [...catalog, target],
    true,
  );
  assert.equal(badge?.kind, "compare");
  assert.ok(badge?.shortLabel.includes("지하철"));
});
