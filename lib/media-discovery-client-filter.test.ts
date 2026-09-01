import test from "node:test";
import assert from "node:assert/strict";
import { matchesBrowseRegion } from "./media-discovery-client-filter.ts";
import {
  aliasMatchesHaystackToken,
  aliasHaystackForeignSidoConflict,
} from "./media-browse-region-haystack-match.ts";
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

test("aliasMatchesHaystackToken — no partial substring", () => {
  assert.equal(aliasMatchesHaystackToken("광주", "교보문고광주점"), false);
  assert.equal(aliasMatchesHaystackToken("광주", "교보문고 광주점"), false);
  assert.equal(aliasMatchesHaystackToken("광주", "교보문고 광주 동구"), true);
  assert.equal(aliasMatchesHaystackToken("남포", "부산 중구 남포동"), true);
  assert.equal(aliasMatchesHaystackToken("서초", "광주 서구"), false);
});

test("aliasHaystackForeignSidoConflict — seoul zone blocks 광주", () => {
  assert.equal(
    aliasHaystackForeignSidoConflict("광주광역시 서구", "seoul"),
    true,
  );
  assert.equal(
    aliasHaystackForeignSidoConflict("서울특별시 강남구", "seoul"),
    false,
  );
});

test("matchesBrowseRegion — seoul_coex haystack fallback", () => {
  const coex = mockMedia({
    name: "코엑스 LED 전광판",
    location: "삼성동 코엑스몰",
    regionMain: "seoul",
    type: "dooh",
  });
  assert.equal(
    matchesBrowseRegion(coex, "seoul", "seoul_coex", ""),
    true,
  );
});

test("matchesBrowseRegion — incheon_airport 리무진 (cross-main)", () => {
  const limo = mockMedia({
    id: "limo-gangnam",
    name: "도심공항 리무진버스 외부 광고 (강남)",
    location: "인천국제공항 ↔ 서울 강남 노선",
    regionMain: "seoul",
    type: "mobile",
    coverageDistrictCodes: ["11680", "28177"],
  });
  assert.equal(
    matchesBrowseRegion(limo, "incheon", "incheon_airport", ""),
    true,
  );
});

test("matchesBrowseRegion — busan_seomyeon 서면", () => {
  const seomyeon = mockMedia({
    name: "서면 지하철 광고",
    location: "부산 부전동 서면역",
    regionMain: "busan",
  });
  assert.equal(
    matchesBrowseRegion(seomyeon, "busan", "busan_seomyeon", ""),
    true,
  );
});

test("matchesBrowseRegion — busan_nampo 남포", () => {
  const nampo = mockMedia({
    name: "남포동 전광판",
    location: "부산 중구 남포동",
    regionMain: "busan",
  });
  assert.equal(
    matchesBrowseRegion(nampo, "busan", "busan_nampo", ""),
    true,
  );
});

test("matchesBrowseRegion — blocks 광주 버스 for seoul_gangnam", () => {
  const gwangjuBus = mockMedia({
    name: "광주 시내버스 내부 영상 광고",
    location: "광주광역시 전 노선",
    regionMain: "gwangju",
    type: "mobile",
    coverageDistrictCodes: ["29110", "29140", "29155", "29170", "29200"],
  });
  assert.equal(
    matchesBrowseRegion(gwangjuBus, "seoul", "seoul_gangnam", ""),
    false,
  );
});

test("matchesBrowseRegion — blocks nationwide 금호 for seoul_gangnam", () => {
  const express = mockMedia({
    name: "금호 고속버스 외부 광고",
    location: "전국 금호고속버스 노선",
    regionMain: "national",
    type: "mobile",
    coverageDistrictCodes: ["28110", "28720"],
  });
  assert.equal(
    matchesBrowseRegion(express, "seoul", "seoul_gangnam", ""),
    false,
  );
});

test("matchesBrowseRegion — blocks 교보문고 for seoul_gangnam (광주 primary)", () => {
  const kyobo = mockMedia({
    id: "nw_kyobo",
    name: "교보문고 디앱스 영상보드광고",
    location: "광주광역시 동구",
    regionMain: "seoul",
    regionSub: "seoul_cbd",
    type: "network",
    networkLocations: [
      {
        name: "교보문고 광주점",
        address: "광주광역시 동구",
        regionMain: "gwangju",
        regionSub: "gwangju_downtown",
      },
    ],
  });
  assert.equal(
    matchesBrowseRegion(kyobo, "seoul", "seoul_gangnam", ""),
    false,
  );
});

test("matchesBrowseRegion — seoul_gangnam mobile with gangnam coverage", () => {
  const mobile = mockMedia({
    name: "서울 버스",
    location: "서울 강남구",
    regionMain: "seoul",
    type: "mobile",
    coverageDistrictCodes: ["11680"],
  });
  assert.equal(
    matchesBrowseRegion(mobile, "seoul", "seoul_gangnam", ""),
    true,
  );
});
