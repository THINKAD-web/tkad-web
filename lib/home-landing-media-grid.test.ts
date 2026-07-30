import assert from "node:assert/strict";
import test from "node:test";
import {
  pickTopDigitalPlatformsFromItems,
  pickTopOohSubsFromCounts,
  resolveLandingDigitalPlatform,
  FALLBACK_DIGITAL_PLATFORM_IDS,
  FALLBACK_OOH_SUB_IDS,
} from "./home-landing-media-grid.ts";

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
    FALLBACK_DIGITAL_PLATFORM_IDS,
  );
});
