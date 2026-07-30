import test from "node:test";
import assert from "node:assert/strict";
import { filterMediaByDiscoveryChips } from "./media-discovery-client-filter.ts";
import type { MediaItem } from "./media-data.ts";

function mockMedia(overrides: Partial<MediaItem>): MediaItem {
  return {
    id: "test-1",
    name: "테스트 매체",
    location: "서울",
    region: "seoul",
    type: "billboard",
    price: 1_000_000,
    lat: 37.5,
    lng: 127.0,
    ...overrides,
  };
}

test("filterMediaByDiscoveryChips — matches description-only tokens", () => {
  const item = mockMedia({
    name: "성수역 디지털 성수15 2호선 지하철 광고",
    catalogDescription: "1~15번에 설치된 디지털 포스터",
  });
  const matched = filterMediaByDiscoveryChips([item], {
    query: "1~15번에",
  });
  assert.equal(matched.length, 1);
});

test("filterMediaByDiscoveryChips — chosung query", () => {
  const item = mockMedia({ name: "성수역 엔스퀘어 광고" });
  const matched = filterMediaByDiscoveryChips([item], { query: "ㅅㅅ" });
  assert.equal(matched.length, 1);
});
