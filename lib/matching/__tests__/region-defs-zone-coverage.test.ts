import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { matchMediaCatalog, type MatchingInput } from "@/lib/matching-engine";
import { PLANNER_BUSAN_ZONE_KEYS } from "@/lib/planner/busan-zones";
import { PLANNER_GYEONGGI_ZONE_KEYS } from "@/lib/planner/gyeonggi-zones";
import {
  incheonZoneToMatchingRegionKey,
  PLANNER_INCHEON_ZONE_KEYS,
} from "@/lib/planner/incheon-zones";
import { PLANNER_SEOUL_ZONE_KEYS } from "@/lib/planner/seoul-zones";

const BASE_INPUT: MatchingInput = {
  monthlyBudgetWon: 20_000_000,
  regions: [],
  industry: "retail",
  targets: ["millennial"],
  durationMonths: 1,
  goal: "consideration",
  goalTags: [],
  seed: 0,
};

function mockMedia(name: string): MediaItem {
  return {
    id: `mock-${name}`,
    name,
    category: "digital",
    monthlyPriceWon: 5_000_000,
    location: name,
    tags: [],
    popularity: 50,
  } as MediaItem;
}

function regionScoreForZone(zoneKey: string, mediaName: string): number {
  const scored = matchMediaCatalog([mockMedia(mediaName)], {
    ...BASE_INPUT,
    regions: [zoneKey],
  }, 1, { strictRegionalPool: true });
  return scored[0]?.breakdown.region ?? 0;
}

const SEOUL_CASES: Record<(typeof PLANNER_SEOUL_ZONE_KEYS)[number], string> = {
  gangnam: "강남역 지하철 광고",
  hongdae: "홍대입구역 스크린도어",
  seongsu: "성수역 전광판",
  myeongdong: "명동 중앙 광고",
  yeouido: "여의도 IFC 전광판",
  guro: "구로역 지하철 전광판",
  jamsil: "잠실역 맥스비전",
  gangbuk: "노원역 지하철 광고",
  gangseo: "목동역 전광판",
};

const BUSAN_CASES: Record<(typeof PLANNER_BUSAN_ZONE_KEYS)[number], string> = {
  centum: "센텀시티 벡스코 전광판",
  haeundae: "해운대 해수욕장 빌보드",
  seomyeon: "서면역 지하철 광고",
  nampo: "남포동 광복로 광고",
  downtown: "부산역 광고",
};

const GYEONGGI_CASES: Record<
  (typeof PLANNER_GYEONGGI_ZONE_KEYS)[number],
  string
> = {
  seongnam: "판교역 지하철 광고",
  suwon: "수원역 전광판",
  goyang: "일산 킨텍스 전광판",
  bucheon: "부천역 지하철 광고",
  gimpo: "김포공항 리무진 광고",
  hanam: "하남 미사 신도시 광고",
  yongin: "용인 기흥역 광고",
  anyang: "안양역 지하철 광고",
  hwaseong: "동탄역 전광판",
  gwangmyeong: "광명역 지하철 광고",
};

const INCHEON_CASES: Record<
  (typeof PLANNER_INCHEON_ZONE_KEYS)[number],
  string
> = {
  airport: "인천국제공항 터미널 광고",
  songdo: "송도 컨벤시아 전광판",
  downtown: "부평역 지하철 광고",
};

for (const [zone, mediaName] of Object.entries(SEOUL_CASES)) {
  test(`REGION_DEFS covers seoul zone: ${zone}`, () => {
    assert.ok(regionScoreForZone(zone, mediaName) >= 15);
  });
}

for (const [zone, mediaName] of Object.entries(BUSAN_CASES)) {
  test(`REGION_DEFS covers busan zone: ${zone}`, () => {
    assert.ok(regionScoreForZone(zone, mediaName) >= 15);
  });
}

for (const [zone, mediaName] of Object.entries(GYEONGGI_CASES)) {
  test(`REGION_DEFS covers gyeonggi zone: ${zone}`, () => {
    assert.ok(regionScoreForZone(zone, mediaName) >= 15);
  });
}

for (const [zone, mediaName] of Object.entries(INCHEON_CASES)) {
  test(`REGION_DEFS covers incheon zone: ${zone}`, () => {
    const key = incheonZoneToMatchingRegionKey(
      zone as (typeof PLANNER_INCHEON_ZONE_KEYS)[number],
    );
    assert.ok(regionScoreForZone(key, mediaName) >= 15);
  });
}

test("REGION_ALIASES: 한글 지명만으로 zone region score", () => {
  assert.ok(regionScoreForZone("구로", "구로 디지털단지 전광판") >= 15);
  assert.ok(regionScoreForZone("판교", "판교 테크노밸리 광고") >= 15);
  assert.ok(regionScoreForZone("송도", "송도 센트럴파크 광고") >= 15);
});
