import assert from "node:assert/strict";
import test from "node:test";
import {
  browseRegionLabel,
  getBrowseRegionSub,
  inferBrowseRegionFromMedia,
} from "@/lib/media-browse-regions";

test("seoul_gwanak — taxonomy resolves id and label", () => {
  const sub = getBrowseRegionSub("seoul", "seoul_gwanak");
  assert.ok(sub);
  assert.equal(sub.id, "seoul_gwanak");
  assert.equal(browseRegionLabel("seoul_gwanak", "ko", "sub", "seoul"), "관악/서울대입구");
});

test("inferBrowseRegionFromMedia — 관악구 district → seoul_gwanak", () => {
  const r = inferBrowseRegionFromMedia({
    region: "seoul",
    regionZone: "gwanak",
    city: "서울",
    district: "관악구",
    location: "서울대입구역 2호선",
  });
  assert.equal(r.main, "seoul");
  assert.equal(r.sub, "seoul_gwanak");
});

test("inferBrowseRegionFromMedia — gwanak zone without 관악 hint does not default to seoul_gwanak", () => {
  const r = inferBrowseRegionFromMedia({
    region: "seoul",
    regionZone: "gwanak",
    city: "서울",
    district: "동작구",
    location: "노량진",
  });
  assert.notEqual(r.sub, "seoul_gwanak");
});

test("inferBrowseRegionFromMedia — null sub 서울 macro tie-break is not seoul_gangnam when 관악 in haystack", () => {
  const r = inferBrowseRegionFromMedia({
    region: "seoul",
    regionZone: null,
    city: "서울",
    district: "관악구",
    location: "서울대입구역 맥스비전",
  });
  assert.equal(r.sub, "seoul_gwanak");
});
