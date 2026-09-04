import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable.ts";
import { EMPTY_BRIEF } from "../types.ts";
import {
  mergeAutofillWithPreservedManualLines,
  rebuildBriefRecommendedMix,
} from "../rebuild-mix.ts";
import { scoreMediaCandidates } from "../scoring.ts";
import {
  computeBriefFingerprint,
  isMixBriefStale,
} from "../brief-fingerprint.ts";
import { resolveOverBudgetChoice } from "../over-budget-options.ts";

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

const onlineCalculable = fixtureMedia({
  id: "online-ig",
  catalogChannel: "online",
  type: null,
  price: null,
  regionMain: "online",
  region: "online",
  onlineSpec: {
    platform: "Meta Instagram",
    minBudget: 800_000,
    cpcMin: 200,
    cpcMax: 600,
    cpmMin: 4000,
    cpmMax: 8000,
  },
});

const onlineInquiry = fixtureMedia({
  id: "online-inquiry",
  catalogChannel: "online",
  type: null,
  price: null,
  regionMain: "online",
  region: "online",
  onlineSpec: {
    platform: "Naver GFA",
    minBudget: 500_000,
    cpcMin: null,
    cpcMax: null,
    cpmMin: null,
    cpmMax: null,
  },
});

const briefBase = {
  ...EMPTY_BRIEF,
  budgetInputWon: 50_000_000,
  regionCodes: ["11"] as const,
  industry: "fb" as const,
};

function assertOfflineOnlyMix(
  mix: { mediaId: string; units: number }[],
  catalog: readonly MediaItem[],
) {
  for (const line of mix) {
    const row = catalog.find((m) => m.id === line.mediaId);
    assert.ok(row, `missing catalog row ${line.mediaId}`);
    assert.equal(
      isOnlineCatalogMedia(row),
      false,
      `online leaked into autofill: ${line.mediaId}`,
    );
  }
}

test("rebuild: F&B 브리프면 업종 축 반영해 fnb 매체가 우선 믹스에 포함", () => {
  const mix = rebuildBriefRecommendedMix({
    brief: briefBase,
    catalog: [techMedia, fnbMedia],
  });
  assert.ok(mix.length >= 1);
  assert.equal(mix[0]!.mediaId, "fnb-bus");
});

test("rebuild: 업종 축 포함 스코어 1위 매체가 믹스 1순위", () => {
  const catalog = [techMedia, fnbMedia];
  const scored = scoreMediaCandidates({
    candidates: catalog,
    brief: briefBase,
    days: 30,
  });
  const mix = rebuildBriefRecommendedMix({ brief: briefBase, catalog });
  assert.ok(mix.length >= 1);
  assert.equal(mix[0]!.mediaId, scored[0]!.media.id);
  assert.equal(mix[0]!.mediaId, "fnb-bus");
});

test("rebuild: online catalog rows never appear in autofill-only result", () => {
  const catalog = [fnbMedia, techMedia, onlineCalculable, onlineInquiry];
  const mix = rebuildBriefRecommendedMix({ brief: briefBase, catalog });
  assertOfflineOnlyMix(mix, catalog);
  assert.ok(!mix.some((l) => l.mediaId.startsWith("online")));
});

test("trigger 1 — autofill button path: offline only", () => {
  const catalog = [fnbMedia, techMedia, onlineCalculable];
  const mix = rebuildBriefRecommendedMix({
    brief: briefBase,
    catalog,
    preserveMixUnits: {},
  });
  assertOfflineOnlyMix(mix, catalog);
});

test("trigger 2 — stale dialog rebuild: offline only", () => {
  const catalog = [fnbMedia, onlineCalculable];
  const mix = rebuildBriefRecommendedMix({
    brief: briefBase,
    catalog,
    preserveMixUnits: { "online-ig": 2 },
  });
  assertOfflineOnlyMix(
    mix.filter((l) => l.mediaId !== "online-ig"),
    catalog,
  );
  assert.equal(mix.find((l) => l.mediaId === "online-ig")?.units, 2);
});

test("trigger 3 — over-budget Option A: offline autofill + preserved manual online", () => {
  const pricey = fixtureMedia({
    id: "pricey",
    price: 18_000_000,
    dailyFootTraffic: 200_000,
    coveragePopulation: 400_000,
  });
  const brief = {
    ...EMPTY_BRIEF,
    budgetInputWon: 12_000_000,
    budgetMode: "total" as const,
    flightStart: "2026-08-01",
    flightEnd: "2026-08-31",
    regionCodes: ["11"] as const,
  };
  const catalog = [pricey, fnbMedia, onlineCalculable];
  const mixUnits = { pricey: 1, "online-ig": 1 };

  const choice = resolveOverBudgetChoice({
    brief,
    catalog,
    mixUnits,
    isKo: true,
  });
  assert.ok(choice);
  assertOfflineOnlyMix(
    choice.optionA.mixLines.filter((l) => l.mediaId !== "online-ig"),
    catalog,
  );
  assert.equal(
    choice.optionA.mixLines.find((l) => l.mediaId === "online-ig")?.units,
    1,
  );
});

test("preserveMixUnits — manual online survives autofill replace", () => {
  const catalog = [fnbMedia, techMedia, onlineCalculable];
  const withoutPreserve = rebuildBriefRecommendedMix({
    brief: briefBase,
    catalog,
  });
  assert.ok(!withoutPreserve.some((l) => l.mediaId === "online-ig"));

  const withPreserve = rebuildBriefRecommendedMix({
    brief: briefBase,
    catalog,
    preserveMixUnits: { "online-ig": 3, "fnb-bus": 1 },
  });
  assert.equal(withPreserve.find((l) => l.mediaId === "online-ig")?.units, 3);
  assertOfflineOnlyMix(
    withPreserve.filter((l) => l.mediaId !== "online-ig"),
    catalog,
  );
});

test("mergeAutofillWithPreservedManualLines — skips autofill-eligible duplicates", () => {
  const merged = mergeAutofillWithPreservedManualLines(
    [{ mediaId: "fnb-bus", units: 2 }],
    { "fnb-bus": 5, "online-ig": 1 },
    [fnbMedia, onlineCalculable],
  );
  assert.equal(merged.find((l) => l.mediaId === "fnb-bus")?.units, 2);
  assert.equal(merged.find((l) => l.mediaId === "online-ig")?.units, 1);
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
