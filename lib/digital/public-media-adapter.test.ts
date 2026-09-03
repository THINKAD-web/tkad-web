import assert from "node:assert/strict";
import test from "node:test";
import {
  toDigitalCatalogItem,
  toPublicMediaView,
  type LocalOnlineMediaRow,
} from "./public-media-adapter.ts";

const sampleRow: LocalOnlineMediaRow = {
  slug: "naver-sa-traffic",
  name: "네이버 검색·사이트유입",
  nameEn: "Naver SA Traffic",
  description: "정보성·비교 키워드로 사이트 유입 확대.",
  descriptionEn: "Informational keywords for site traffic.",
  onlineSpec: {
    platform: "Naver Search Ads",
    minBudget: 700_000,
    cpcMin: 400,
    cpcMax: 1200,
    cpmMin: null,
    cpmMax: null,
    targetingOptions: [
      "industry:ECOMMERCE",
      "goal:TRAFFIC",
      "age:25-34",
      "gender:ALL",
      "geo:KR",
    ],
    strengths: ["확장검색 관리"],
    kpiHints: ["예상 CPC 400~1,200원"],
    bestFor: ["확장검색 관리"],
  },
};

test("toPublicMediaView — slug meta + targeting parse", () => {
  const view = toPublicMediaView(sampleRow);
  assert.equal(view.slug, "naver-sa-traffic");
  assert.equal(view.channel, "NAVER_SA");
  assert.equal(view.mediaType, "SA");
  assert.equal(view.objective, "TRAFFIC");
  assert.deepEqual(view.fitGoals, ["TRAFFIC"]);
  assert.equal(view.sortOrder, 52);
  assert.deepEqual(view.billingType, ["CPC"]);
});

test("toDigitalCatalogItem — bridge subset", () => {
  const item = toDigitalCatalogItem(toPublicMediaView(sampleRow));
  assert.equal(item.slug, "naver-sa-traffic");
  assert.equal(item.channel, "NAVER_SA");
  assert.equal(item.mediaType, "SA");
  assert.equal(item.cpcMin, 400);
});
