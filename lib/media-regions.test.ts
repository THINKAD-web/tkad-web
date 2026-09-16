import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  inferBrowseRegionFromMedia,
} from "@/lib/media-browse-regions";
import {
  normalizeMediaLocationFields,
  regionZoneLabel,
} from "@/lib/media-regions";

describe("normalizeMediaLocationFields", () => {
  test("district가 있으면 stale nowon regionZone을 덮어씀", () => {
    const loc = normalizeMediaLocationFields({
      district: "관악구",
      city: "서울",
      location: "관악신사시장",
      regionZone: "nowon",
    });
    assert.equal(loc.regionZone, "gwanak");
    assert.equal(regionZoneLabel(loc.regionZone, "ko"), "관악권");
  });

  test("경기 광명시를 gyeonggi zone으로 인식", () => {
    const loc = normalizeMediaLocationFields({
      district: "광명시",
      location: "광명전통시장 LED",
    });
    assert.equal(loc.regionZone, "gyeonggi");
    assert.equal(loc.region, "national");
  });

  test("location에서 광명시 추출 후 gyeonggi zone", () => {
    const loc = normalizeMediaLocationFields({
      location: "경기 광명시 광명전통시장",
    });
    assert.equal(loc.district, "광명시");
    assert.equal(loc.regionZone, "gyeonggi");
  });

  test("강서구는 gangseo zone", () => {
    const loc = normalizeMediaLocationFields({
      district: "강서구",
      location: "화곡중앙시장",
      regionZone: "nowon",
    });
    assert.equal(loc.regionZone, "gangseo");
  });
});

describe("inferBrowseRegionFromMedia zone mapping", () => {
  test("nowon zone → seoul_gangbuk", () => {
    const r = inferBrowseRegionFromMedia({ regionZone: "nowon" });
    assert.deepEqual(r, { main: "seoul", sub: "seoul_gangbuk" });
  });

  test("gangseo zone → seoul_gangseo_yangcheon", () => {
    const r = inferBrowseRegionFromMedia({ regionZone: "gangseo" });
    assert.deepEqual(r, { main: "seoul", sub: "seoul_gangseo_yangcheon" });
  });

  test("gyeonggi zone + 광명 district → gyeonggi_gwangmyeong", () => {
    const r = inferBrowseRegionFromMedia({
      regionZone: "gyeonggi",
      district: "광명시",
      city: "경기",
    });
    assert.equal(r.main, "gyeonggi");
    assert.equal(r.sub, "gyeonggi_gwangmyeong");
  });
});
