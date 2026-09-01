import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { EMPTY_BRIEF } from "../types.ts";
import { rebuildBriefRecommendedMix } from "../rebuild-mix.ts";
import { scoreMediaCandidates } from "../scoring.ts";
import {
  computeBriefFingerprint,
  isMixBriefStale,
} from "../brief-fingerprint.ts";

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-1",
    name: "픽스처 DOOH",
    nameEn: "Fixture DOOH",
    location: "서울 강남",
    locationEn: "Gangnam, Seoul",
    region: "seoul",
    regionMain: "seoul",
    city: "서울",
    district: "강남구",
    type: "dooh",
    subCategory: "led_screen",
    mediaCategory: ["ooh"],
    price: 10_000_000,
    pricePeriod: "month",
    dailyFootTraffic: 100_000,
    visibilityScore: 85,
    ...over,
  } as MediaItem;
}

const fnbMedia = fixtureMedia({
  id: "fnb-bus",
  type: "mobile",
  subCategory: "bus_shelter",
  location: "강남 상권 버스쉘터",
  tags: ["카페", "식음료"],
  regionMain: "seoul",
});

const techMedia = fixtureMedia({
  id: "tech-dooh",
  type: "dooh",
  subCategory: "office",
  location: "판교 테크밸리",
  tags: ["it", "saas"],
  regionMain: "seoul",
});

test("rebuild: F&B 브리프면 업종 축 반영해 fnb 매체가 우선 믹스에 포함", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 50_000_000,
    regionCodes: ["11"] as const,
    industry: "fb" as const,
  };
  const mix = rebuildBriefRecommendedMix({
    brief,
    catalog: [techMedia, fnbMedia],
  });
  assert.ok(mix.length >= 1);
  assert.equal(mix[0]!.mediaId, "fnb-bus");
});

test("rebuild: 업종 축 포함 스코어 1위 매체가 믹스 1순위", () => {
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 50_000_000,
    regionCodes: ["11"] as const,
    industry: "fb" as const,
  };
  const catalog = [techMedia, fnbMedia];
  const scored = scoreMediaCandidates({
    candidates: catalog,
    brief,
    days: 30,
  });
  const mix = rebuildBriefRecommendedMix({ brief, catalog });
  assert.ok(mix.length >= 1);
  assert.equal(mix[0]!.mediaId, scored[0]!.media.id);
  assert.equal(mix[0]!.mediaId, "fnb-bus");
});

test("keep stale mix: mixUnits 유지 + fingerprint 갱신으로 stale 해소", () => {
  const atMix = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    industry: "fb" as const,
  };
  const fpAtMix = computeBriefFingerprint(atMix);
  const mixUnits = { m1: 1, m2: 2 };
  const changed = { ...atMix, budgetInputWon: 50_000_000 };

  assert.equal(
    isMixBriefStale({
      mixUnits,
      mixBriefFingerprint: fpAtMix,
      brief: changed,
    }),
    true,
  );

  const fpAfterKeep = computeBriefFingerprint(changed);
  assert.deepEqual(mixUnits, { m1: 1, m2: 2 });
  assert.equal(
    isMixBriefStale({
      mixUnits,
      mixBriefFingerprint: fpAfterKeep,
      brief: changed,
    }),
    false,
  );
});
