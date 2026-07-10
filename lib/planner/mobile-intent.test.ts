import test from "node:test";
import assert from "node:assert/strict";
import type { MediaItem } from "@/lib/media-data";
import {
  mediaMatchesPlannerMobileIntent,
  matchesPlannerCategory,
  resolvePlannerMediaKind,
} from "@/lib/planner-logic";

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
    price: 500,
    location: "서울",
    ...extra,
  } as MediaItem;
}

test("mediaMatchesPlannerMobileIntent: true mobile kind", () => {
  const bus = mockMedia("b1", "강남 버스 래핑", { type: "mobile" });
  assert.equal(matchesPlannerCategory(bus, "mobile"), true);
  assert.equal(mediaMatchesPlannerMobileIntent(bus), true);
});

test("mediaMatchesPlannerMobileIntent: taxi wrap network", () => {
  const taxi = mockMedia("t1", "서울 택시 래핑", {
    type: "network",
    catalogSource: "network",
  });
  assert.equal(mediaMatchesPlannerMobileIntent(taxi), true);
});

test("mediaMatchesPlannerMobileIntent: taxi shelter included", () => {
  const shelter = mockMedia("s1", "디지털 택시쉘터 광고 (강남)", {
    type: "digital",
    mediaSubCategory: "digital_signage",
  });
  assert.equal(mediaMatchesPlannerMobileIntent(shelter), true);
});

test("mediaMatchesPlannerMobileIntent: excludes signage despite bus in tags", () => {
  const signage = mockMedia("sig1", "강남 센트럴시티 보이드 디지털사이니지 광고", {
    type: "digital",
    mediaSubCategory: "digital_signage",
    subCategory: "디지털 사이니지",
    tags: [
      "고속터미널역",
      "버스 대형",
      "고속터미널 연결",
      "LED",
      "DOOH",
    ],
  });
  assert.equal(resolvePlannerMediaKind(signage), "digital");
  assert.equal(mediaMatchesPlannerMobileIntent(signage), false);
});

test("mediaMatchesPlannerMobileIntent: excludes subway station canvas", () => {
  const subway = mockMedia("sub1", "지하철 9호선 고속터미널역 캔버스9 광고", {
    type: "digital",
    mediaSubCategory: "subway",
  });
  assert.equal(mediaMatchesPlannerMobileIntent(subway), false);
});

test("mediaMatchesPlannerMobileIntent: limousine bus", () => {
  const limo = mockMedia("l1", "도심공항 리무진버스 외부 광고 (강남)", {
    type: "mobile",
  });
  assert.equal(mediaMatchesPlannerMobileIntent(limo), true);
});

test("mediaMatchesPlannerMobileIntent: generic shelter without taxi excluded", () => {
  const shelter = mockMedia("g1", "강남 버스쉘터 디지털 광고", {
    type: "digital",
  });
  assert.equal(mediaMatchesPlannerMobileIntent(shelter), false);
});
