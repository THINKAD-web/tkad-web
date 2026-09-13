import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOohTile,
  pickTopDigitalPlatformsFromItems,
  pickTopOohSubsFromCounts,
  resolveLandingDigitalPlatform,
  FALLBACK_OOH_SUB_IDS,
} from "./home-landing-media-grid.ts";

test("buildOohTile: DB로 안전 확인된 subId는 캐노니컬 SEO 페이지로 연결 (#579)", () => {
  assert.equal(buildOohTile("digital_signage", 10)?.href, "/media/type/dooh");
  assert.equal(
    buildOohTile("subway_station", 10)?.href,
    "/media/category/subway",
  );
});

test("buildOohTile: 검증 안 된 subId(airport 등)는 기존 쿼리스트링 유지", () => {
  assert.equal(
    buildOohTile("airport", 10)?.href,
    "/media?mainCategory=transit&subCategory=airport",
  );
});

test("pickTopOohSubsFromCounts returns catalog top 3", () => {
  const picked = pickTopOohSubsFromCounts({
    digital_signage: 298,
    subway_station: 166,
    airport: 72,
    mall: 55,
    billboard: 29,
    social_media: 99, // online taxonomy — excluded
  });
  assert.deepEqual(
    picked.map((p) => p.subId),
    [...FALLBACK_OOH_SUB_IDS],
  );
});

test("resolveLandingDigitalPlatform maps Meta / Google / Naver families", () => {
  assert.equal(
    resolveLandingDigitalPlatform({
      slug: "ig",
      nameKo: "IG",
      channel: "INSTAGRAM",
      platform: "Meta Instagram",
      mediaType: "SNS",
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    }),
    "meta",
  );
  assert.equal(
    resolveLandingDigitalPlatform({
      slug: "yt",
      nameKo: "YT",
      channel: "YOUTUBE",
      platform: "YouTube",
      mediaType: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    }),
    "google",
  );
  assert.equal(
    resolveLandingDigitalPlatform({
      slug: "gfa",
      nameKo: "GFA",
      channel: "OTHER",
      platform: "Naver GFA",
      mediaType: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    }),
    "naver",
  );
});

test("pickTopDigitalPlatformsFromItems prefers Meta Google Naver by count", () => {
  const items = [
    ...Array.from({ length: 7 }, (_, i) => ({
      slug: `m${i}`,
      nameKo: "m",
      channel: "INSTAGRAM",
      platform: "Meta Instagram",
      mediaType: "SNS",
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      slug: `g${i}`,
      nameKo: "g",
      channel: "GOOGLE_ADS",
      platform: "Google Ads",
      mediaType: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      slug: `n${i}`,
      nameKo: "n",
      channel: "NAVER_SA",
      platform: "Naver Search Ads",
      mediaType: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    })),
    ...Array.from({ length: 2 }, (_, i) => ({
      slug: `k${i}`,
      nameKo: "k",
      channel: "KAKAO",
      platform: "Kakao Moment",
      mediaType: null,
      cpcMin: null,
      cpcMax: null,
      cpmMin: null,
      cpmMax: null,
    })),
  ];
  const top = pickTopDigitalPlatformsFromItems(items, 3);
  assert.deepEqual(
    top.map((t) => t.platformId),
    ["meta", "google", "naver"],
  );
});
