import assert from "node:assert/strict";
import test from "node:test";
import { buildEngineInput } from "./build-input.ts";
import { computeMetric } from "./compute.ts";
import { MODEL_VERSIONS } from "./constants.ts";

test("v1-impressions: ensquare footfall + factSheet SOV → monthly impressions", () => {
  const input = buildEngineInput({
    id: "test-ensquare",
    name: "지하철 2호선 강남역 엔스퀘어 광고",
    type: "digital",
    subCategory: "subway_station",
    mediaMainCategory: "transit",
    mediaSubCategory: "subway_station",
    dailyFootfall: 240_000,
    price: 10_000_000,
    visibilityScore: 0,
    impressions: null,
    cpm: null,
    factSheet: {
      id: "fs1",
      mediaId: "test-ensquare",
      latitude: 37.5,
      longitude: 127.0,
      mediaSubtype: "subway_dooh",
      widthMm: null,
      heightMm: null,
      dimensionSource: null,
      installHeightM: null,
      bearing: null,
      viewDistanceM: null,
      operatingStart: null,
      operatingEnd: null,
      timezone: "Asia/Seoul",
      stationCode: null,
      stationLineCode: null,
      spotDurationSec: 15,
      loopDurationSec: 150,
      playsPerHour: null,
      forceLoopSov: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    externalSignals: [],
    computedMetric: null,
  });

  const { output, engineVersion } = computeMetric(input);
  assert.equal(engineVersion, MODEL_VERSIONS.V1_IMPRESSIONS);
  assert.equal(output.sovShare, 0.1);
  assert.ok((output.monthlyImpressions ?? 0) > 0);
  assert.ok(output.cpm > 0);
});

test("v0-fallback: impressions only, no footfall", () => {
  const input = buildEngineInput({
    id: "test-bus",
    name: "버스 패키지",
    type: "mobile",
    subCategory: "bus_exterior",
    mediaMainCategory: null,
    mediaSubCategory: "bus_exterior",
    dailyFootfall: null,
    price: 100_000_000,
    visibilityScore: 0,
    impressions: 52_000_000,
    cpm: 1923,
    factSheet: null,
    externalSignals: [],
    computedMetric: null,
  });

  const { output, engineVersion } = computeMetric(input);
  assert.equal(engineVersion, MODEL_VERSIONS.V0_FALLBACK);
  assert.equal(output.monthlyImpressions, 52_000_000);
});
