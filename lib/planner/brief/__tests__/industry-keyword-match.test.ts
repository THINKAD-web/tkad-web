import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ENT_KEYWORDS,
  FB_KEYWORDS,
  matchKeywordTierInMedia,
  RETAIL_KEYWORDS,
  TECH_KEYWORDS,
  textFieldIncludesTerm,
} from "../industry-keyword-match.ts";
import { classifyBriefIndustryMatch } from "../industry-bonus.ts";
import type { MediaItem } from "@/lib/media-data";

function fixture(
  overrides: Partial<MediaItem> & { id: string },
): MediaItem {
  return {
    id: overrides.id,
    name: "테스트",
    nameEn: "Test",
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    regionMain: "seoul",
    city: "서울",
    district: "강남구",
    type: "dooh",
    subCategory: "led",
    mediaCategory: ["ooh"],
    price: 5_000_000,
    pricePeriod: "month",
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 50_000,
    visibilityScore: 80,
    ...overrides,
  } as MediaItem;
}

test("textFieldIncludesTerm — mall does not match small_business tag", () => {
  assert.equal(textFieldIncludesTerm("target:small_business", "mall"), false);
  assert.equal(textFieldIncludesTerm("shopping_mall", "mall"), false);
  assert.equal(textFieldIncludesTerm("mall", "mall"), true);
  assert.equal(textFieldIncludesTerm("IFC Mall lobby", "mall"), true);
});

test("textFieldIncludesTerm — 앱 does not match 디앱스", () => {
  assert.equal(textFieldIncludesTerm("디앱스", "앱"), false);
  assert.equal(textFieldIncludesTerm("모바일 앱 광고", "앱"), true);
});

test("retail — 쇼핑몰 Strong, 패션·뷰티 태그 Medium", () => {
  const mall = fixture({
    id: "mall",
    name: "잠실 롯데월드몰 LED",
    subCategory: "쇼핑몰",
    tags: ["패션 뷰티 타겟"],
  });
  assert.equal(matchKeywordTierInMedia(mall, RETAIL_KEYWORDS), "strong");
  assert.equal(classifyBriefIndustryMatch(mall, "retail"), "strong");

  const beautyOnly = fixture({
    id: "beauty",
    name: "홍대 전광판",
    tags: ["패션 뷰티 타겟"],
  });
  assert.equal(matchKeywordTierInMedia(beautyOnly, RETAIL_KEYWORDS), "medium");
  assert.equal(classifyBriefIndustryMatch(beautyOnly, "retail"), "medium");

  const kiosk = fixture({
    id: "kiosk",
    name: "대학교 캠퍼스 키오스크",
    type: "network",
    subCategory: "campus_kiosk",
    tags: ["target:small_business", "venue:campus_kiosk"],
  });
  assert.equal(matchKeywordTierInMedia(kiosk, RETAIL_KEYWORDS), "none");
  assert.equal(classifyBriefIndustryMatch(kiosk, "retail"), "weak");
});

test("retail — shopping_mall exact tag Strong", () => {
  const m = fixture({
    id: "tag-mall",
    name: "City display",
    tags: ["shopping_mall"],
  });
  assert.equal(matchKeywordTierInMedia(m, RETAIL_KEYWORDS), "strong");
});

test("tech — 디앱스 is not Strong via 앱 substring", () => {
  const m = fixture({
    id: "dapps",
    name: "교보문고 디앱스 영상보드",
    type: "network",
    tags: ["network", "digital"],
  });
  assert.equal(matchKeywordTierInMedia(m, TECH_KEYWORDS), "none");
  assert.equal(classifyBriefIndustryMatch(m, "tech"), "weak");
});

test("tech — 테헤란로·판교 hub Strong", () => {
  const m = fixture({
    id: "teheran",
    name: "에코큐브 스마트 쉘터 (테헤란로)",
    district: "강남구",
  });
  assert.equal(classifyBriefIndustryMatch(m, "tech"), "strong");
});

test("fb — 주점 does not match 광주점", () => {
  assert.equal(textFieldIncludesTerm("교보문고 광주점", "주점"), false);
  assert.equal(textFieldIncludesTerm("강남 주점 거리", "주점"), true);
  const m = fixture({
    id: "gwangju",
    name: "교보문고 광주점",
    type: "network",
  });
  assert.equal(classifyBriefIndustryMatch(m, "fb"), "weak");
});

test("ent — fan does not match target:fandom tag", () => {
  assert.equal(textFieldIncludesTerm("target:fandom", "fan"), false);
  const m = fixture({
    id: "fandom-tag",
    name: "City display",
    type: "network",
    tags: ["target:fandom"],
  });
  assert.equal(classifyBriefIndustryMatch(m, "ent"), "weak");
  assert.equal(
    classifyBriefIndustryMatch(
      fixture({ id: "fan-tag", tags: ["fan"] }),
      "ent",
    ),
    "strong",
  );
});
