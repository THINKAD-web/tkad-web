import test from "node:test";
import assert from "node:assert/strict";
import type { MediaItem } from "@/lib/media-data";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { buildAiRecommendInputFromFreetextRaw } from "@/lib/recommend/build-freetext-recommend-input";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import { runRecommendMatchFromCatalog } from "@/lib/recommend/recommend-region-filter";
import { matchMediaCatalog } from "@/lib/matching-engine";

function mockMedia(
  id: string,
  name: string,
  extra: Partial<MediaItem> = {},
): MediaItem {
  return {
    id,
    name,
    nameEn: name,
    region: "seoul",
    regionMain: "seoul",
    type: "digital",
    price: 300,
    location: name,
    ...extra,
  } as MediaItem;
}

const SUBWAY_CATALOG: MediaItem[] = [
  mockMedia("l9-1", "지하철 9호선 신논현역 캔버스9 광고", {
    mediaSubCategory: "subway",
    price: 500,
  }),
  mockMedia("l9-2", "지하철 9호선 여의도역 캔버스9 광고", {
    mediaSubCategory: "subway",
    price: 500,
  }),
  mockMedia("l9-3", "지하철 9호선 노량진역 캔버스9 광고", {
    mediaSubCategory: "subway",
    price: 500,
  }),
  mockMedia("l9-4", "지하철 9호선 고속터미널역 캔버스9 광고", {
    mediaSubCategory: "subway",
    price: 500,
  }),
  mockMedia("l2-1", "2호선 사당역 디지털포스터 지하철 광고", {
    mediaSubCategory: "subway",
    regionMain: "seoul",
    price: 400,
  }),
  mockMedia("l2-daegu", "대구 반월당역 사각기둥 광고", {
    mediaSubCategory: "subway",
    regionMain: "daegu",
    location: "대구광역시 2호선 반월당역",
    price: 400,
  }),
  mockMedia("l3-1", "지하철 3호선 고속터미널역 맥스비전 광고", {
    mediaSubCategory: "subway",
    price: 400,
  }),
  mockMedia("taxi", "택시 미디어바 광고", {
    type: "mobile",
    mediaSubCategory: "subway_station",
    subCategory: "택시 미디어바",
    price: 200,
  }),
  mockMedia("arex", "공항철도 홍대입구역 디지털사이니지 광고", {
    mediaSubCategory: "subway",
    price: 400,
  }),
  mockMedia("billboard", "강남대로 미디어폴 G-LIGHT", {
    type: "static",
    price: 800,
  }),
];

function runQuery(raw: string, catalog: MediaItem[], limit = 10) {
  const parsed = parsePlannerFreetextBrief(raw);
  const input = buildAiRecommendInputFromFreetextRaw(raw, true);
  assert.ok(input, `input for ${raw}`);
  const matching = aiInputToMatching(input!, 0);
  const { recommendations } = runRecommendMatchFromCatalog(
    catalog,
    matching,
    limit,
    input!,
  );
  return { parsed, matching, recommendations };
}

test("subway line matching: 9호선 top 4 are line-9 items", () => {
  const { recommendations } = runQuery("9호선 지하철광고", SUBWAY_CATALOG);
  const top4 = recommendations.slice(0, 4);
  assert.equal(top4.length, 4);
  for (const r of top4) {
    assert.match(r.media.name, /9호선/);
  }
  assert.ok(recommendations.every((r) => r.media.id !== "taxi"));
});

test("subway line matching: 2호선 ranks seoul 2호선 first", () => {
  const { parsed, recommendations } = runQuery("2호선 지하철광고", SUBWAY_CATALOG);
  assert.equal(parsed.fields.subwayLine.value, "seoul:2");
  assert.match(recommendations[0]!.media.name, /2호선/);
  assert.equal(recommendations[0]!.media.regionMain, "seoul");
  assert.notEqual(recommendations[0]!.media.id, "l2-daegu");
});

test("subway line matching: 대구 2호선 ranks daegu first", () => {
  const { parsed, recommendations } = runQuery("대구 2호선 광고", SUBWAY_CATALOG);
  assert.equal(parsed.fields.subwayLine.value, "daegu:2");
  assert.equal(recommendations[0]!.media.id, "l2-daegu");
});

test("subway line matching: generic 지하철 keeps broad subway pool", () => {
  const { parsed, matching, recommendations } = runQuery(
    "지하철 광고",
    SUBWAY_CATALOG,
  );
  assert.equal(parsed.fields.subwayLine.value, null);
  assert.equal(matching.subwayLine, undefined);
  const ids = recommendations.map((r) => r.media.id);
  assert.ok(ids.includes("l2-1") || ids.includes("l9-1"));
});

test("subway line matching: 강남 전광판 no subway line regression", () => {
  const { parsed, matching, recommendations } = runQuery(
    "강남 전광판",
    SUBWAY_CATALOG,
  );
  assert.equal(parsed.fields.subwayLine.value, null);
  assert.equal(matching.subwayLine, undefined);
  assert.ok(recommendations.length > 0);
  assert.ok(
    recommendations.every((r) => r.breakdown.subwayLine == null),
    "no subway line scoring applied",
  );
});
