import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  computeSharedMatchBonuses,
  extractMediaTargetSignals,
} from "@/lib/matching/shared-scoring";
import type { TargetProfile } from "@/lib/matching/target-profile";

function fixtureMedia(
  overrides: Partial<MediaItem> & { id: string },
): MediaItem {
  return {
    name: "테스트 매체",
    regionMain: "jeju",
    type: "dooh",
    price: 10_000_000,
    subCategory: "billboard",
    ...overrides,
  } as MediaItem;
}

test("extractMediaTargetSignals: 공항 태그 + airport class", () => {
  const m = fixtureMedia({
    id: "air1",
    name: "제주공항 LED",
    tags: ["공항", "관광"],
  });
  const s = extractMediaTargetSignals(m);
  assert.equal(s.airport, true);
  assert.equal(s.tourist, true);
});

test("shared-scoring: 공항 태그 + residency resident → 감점", () => {
  const profile: TargetProfile = {
    segment: "mass",
    residency: "resident",
    nationality: "domestic",
  };
  const airport = fixtureMedia({
    id: "j-air",
    name: "제주공항 전광판",
    tags: ["공항"],
  });
  const city = fixtureMedia({
    id: "j-city",
    name: "제주 중앙로 전광판",
    tags: [],
  });

  const airBonus = computeSharedMatchBonuses(
    airport,
    { targetProfile: profile },
    { engine: "catalog" },
  );
  const cityBonus = computeSharedMatchBonuses(
    city,
    { targetProfile: profile },
    { engine: "catalog" },
  );

  assert.ok(airBonus.targetProfile);
  assert.ok(cityBonus.targetProfile);
  assert.ok(
    airBonus.targetProfile!.catalogPoints < cityBonus.targetProfile!.catalogPoints,
    `airport ${airBonus.targetProfile!.catalogPoints} should be less than city ${cityBonus.targetProfile!.catalogPoints}`,
  );
  assert.ok(airBonus.targetProfile!.catalogPoints <= 0 || airBonus.targetProfile!.catalogPoints < 3);
});

test("shared-scoring: 태그 없는 매체 → nationality domestic만 +3", () => {
  const profile: TargetProfile = {
    segment: null,
    nationality: "domestic",
  };
  const m = fixtureMedia({ id: "plain", tags: [] });
  const result = computeSharedMatchBonuses(
    m,
    { targetProfile: profile },
    { engine: "catalog" },
  );
  assert.equal(result.targetProfile?.catalogPoints, 3);
});

test("shared-scoring: targetProfile 없음 → null (회귀)", () => {
  const m = fixtureMedia({ id: "plain2", tags: ["공항"] });
  const result = computeSharedMatchBonuses(m, {}, { engine: "catalog" });
  assert.equal(result.targetProfile, null);
  assert.equal(result.hotspot, null);
});

test("shared-scoring: hotspot only — airport conflict for resident corridor", () => {
  const airport = fixtureMedia({
    id: "hs-air",
    name: "제주공항",
    hotspotTags: [
      { regionId: "jeju", zoneId: "jeju_airport", type: "airport", weight: 1.2 },
    ],
  });
  const downtown = fixtureMedia({
    id: "hs-city",
    name: "중앙로",
    hotspotTags: [
      {
        regionId: "jeju",
        zoneId: "jeju_downtown",
        type: "residential",
        weight: 1,
      },
    ],
  });
  const requested = [
    { regionId: "jeju" as const, type: "residential" as const, weight: 1 },
    { regionId: "jeju" as const, type: "transit_corridor" as const, weight: 1 },
  ];

  const air = computeSharedMatchBonuses(
    airport,
    { requestedHotspots: requested },
    { engine: "catalog" },
  );
  const city = computeSharedMatchBonuses(
    downtown,
    { requestedHotspots: requested },
    { engine: "catalog" },
  );

  assert.ok(air.hotspot);
  assert.ok(city.hotspot);
  assert.ok(air.hotspot!.catalogPoints < city.hotspot!.catalogPoints);
  assert.equal(air.targetProfile, null);
});
