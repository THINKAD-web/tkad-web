import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDigitalChannelsFromCatalogItems } from "@/lib/planner/digital-catalog-bridge";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

const sample: DigitalCatalogItem[] = [
  {
    slug: "naver-gfa",
    nameKo: "네이버 GFA",
    channel: "NAVER_SA",
    platform: "Naver GFA",
    mediaType: "DA",
    cpcMin: 400,
    cpcMax: 440,
    cpmMin: 7000,
    cpmMax: 7400,
  },
  {
    slug: "karrot-local",
    nameKo: "당근",
    channel: "FACEBOOK",
    platform: "Karrot (당근)",
    mediaType: "DA",
    cpcMin: 340,
    cpcMax: 360,
    cpmMin: 5600,
    cpmMax: 6000,
  },
];

describe("buildDigitalChannelsFromCatalogItems", () => {
  it("aggregates live CPC/CPM for mapped buckets", () => {
    const result = buildDigitalChannelsFromCatalogItems(sample);
    const naver = result.channels.find((c) => c.id === "naver");
    const daangn = result.channels.find((c) => c.id === "daangn");
    assert.equal(naver?.avgCpcWon, 420);
    assert.equal(naver?.avgCpmWon, 7200);
    assert.equal(daangn?.avgCpcWon, 350);
    assert.equal(result.meta.source, "live");
  });

  it("flags empty buckets for fallback", () => {
    const result = buildDigitalChannelsFromCatalogItems(sample);
    assert.ok(result.meta.fallbackBucketIds.includes("buzzvil"));
    assert.ok(result.meta.fallbackBucketIds.includes("tiktok"));
  });
});
