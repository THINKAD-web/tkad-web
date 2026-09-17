import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  attachSeoulBenchmarksToPortfolioRows,
  computeSeoulTypeBenchmarks,
  SEOUL_BENCHMARK_INSUFFICIENT_KO,
  seoulBenchmarkBucketForMedia,
} from "@/lib/planner/seoul-media-benchmark";

function baseMedia(over: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    id: over.id,
    name: over.name ?? over.id,
    nameEn: over.name ?? over.id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: over.type ?? "static",
    price: over.price ?? 1_000_000,
    pricePeriod: "month",
    lat: 0,
    lng: 0,
    dailyFootTraffic: over.dailyFootTraffic ?? 150_000,
    sampleImages: [],
    regionMain: "seoul",
    mediaSubCategory: over.mediaSubCategory,
    subCategory: over.subCategory,
    ...over,
  };
}

test("seoulBenchmarkBucketForMedia maps shelter and subway", () => {
  assert.equal(
    seoulBenchmarkBucketForMedia(
      baseMedia({ id: "1", mediaSubCategory: "bus_shelter" }),
    ),
    "bus_shelter",
  );
  assert.equal(
    seoulBenchmarkBucketForMedia(
      baseMedia({ id: "2", mediaSubCategory: "subway_station" }),
    ),
    "subway",
  );
});

test("computeSeoulTypeBenchmarks marks bus_exterior insufficient with sparse in-range cpms", () => {
  const stats = computeSeoulTypeBenchmarks([]);
  assert.equal(stats.bus_exterior.cpmComparable, false);
  assert.equal(stats.bus_exterior.nCpm, 0);
});

test("attachSeoulBenchmarks shows insufficient for bus_exterior when nCpm < 5", () => {
  const catalog = Array.from({ length: 6 }, (_, i) =>
    baseMedia({
      id: `be-${i}`,
      mediaSubCategory: "bus_exterior",
      dailyFootTraffic: 800_000,
      price: 50_000,
    }),
  );
  const rows = attachSeoulBenchmarksToPortfolioRows({
    portfolioRows: [
      {
        id: "be-0",
        name: "Bus wrap",
        dailyTraffic: 800_000,
      },
    ],
    catalog,
    planItems: [{ id: "be-0", cpmWon: 25_000 }],
    isKo: true,
  });
  assert.ok(rows[0]?.cpmBenchmarkLabel?.includes(SEOUL_BENCHMARK_INSUFFICIENT_KO));
});
