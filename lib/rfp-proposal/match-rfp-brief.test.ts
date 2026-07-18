import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { matchRfpProposalBrief } from "@/lib/rfp-proposal/match-rfp-brief";
import { normalizeRfpProposalBrief } from "@/lib/rfp-proposal/normalize";

function stubMedia(partial: Partial<MediaItem> & { id: string; name: string }): MediaItem {
  return {
    nameEn: partial.name,
    location: partial.location ?? "서울",
    locationEn: partial.location ?? "Seoul",
    region: partial.region ?? "seoul",
    type: partial.type ?? "digital",
    price: partial.price ?? 500,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 10_000,
    ...partial,
  } as MediaItem;
}

const catalog: MediaItem[] = [
  stubMedia({
    id: "airport-t1-sign",
    name: "인천공항 T1 디지털",
    location: "인천공항 T1",
    region: "incheon",
    type: "digital",
    mediaCategory: ["digital"],
    price: 800,
  }),
  stubMedia({
    id: "airport-t2-sign",
    name: "인천공항 T2 DOOH",
    location: "인천공항 T2",
    region: "incheon",
    type: "digital",
    mediaCategory: ["digital"],
    price: 900,
  }),
  stubMedia({
    id: "gangnam-psd",
    name: "강남역 PSD",
    location: "강남역",
    type: "transit",
    mediaCategory: ["subway"],
    nearbyStations: "강남",
    price: 400,
  }),
  stubMedia({
    id: "samsung-screen",
    name: "삼성역 스크린도어",
    location: "삼성역",
    type: "transit",
    nearbyStations: "삼성",
    price: 350,
  }),
  stubMedia({
    id: "coex-dooh",
    name: "코엑스 DOOH",
    location: "코엑스 K-POP광장 인근",
    type: "digital",
    mediaCategory: ["digital"],
    price: 600,
  }),
  stubMedia({
    id: "busan-billboard",
    name: "부산 빌보드",
    location: "해운대",
    region: "busan",
    type: "billboard",
    price: 300,
  }),
];

test("matchRfpProposalBrief: 그룹별 독립 매칭 + groupId 귀속", async () => {
  const brief = normalizeRfpProposalBrief({
    campaign: {
      brandName: "ZHITAI",
      industry: "IT / 게이밍",
      target: "테크 소비층",
      period: "2026년 하반기",
    },
    groups: [
      {
        label: "공항 권역",
        regionKeywords: ["인천공항 T1", "인천공항 T2"],
        mediaTypeKeywords: ["디지털 사이니지", "DOOH"],
      },
      {
        label: "핵심 상권",
        regionKeywords: ["코엑스 K-POP광장", "강남"],
        mediaTypeKeywords: ["DOOH"],
      },
      {
        label: "지하철 역사",
        regionKeywords: ["강남", "삼성"],
        mediaTypeKeywords: ["PSD", "스크린도어"],
      },
    ],
  });
  assert.ok(brief);

  const result = await matchRfpProposalBrief(brief!, {
    catalog,
    limitPerGroup: 5,
    isKo: true,
  });

  assert.equal(result.groups.length, 3);
  assert.equal(result.catalogCount, catalog.length);

  const airport = result.groups.find((g) => g.groupLabel.includes("공항"));
  assert.ok(airport);
  assert.equal(airport!.groupId, brief!.groups[0]!.id);
  assert.ok(airport!.mediaItems.length > 0);
  assert.ok(
    airport!.mediaItems.some((m) => m.mediaId.includes("airport")),
    "공항 그룹에 공항 매체가 포함되어야 함",
  );

  const subway = result.groups.find((g) => g.groupLabel.includes("지하철"));
  assert.ok(subway);
  assert.ok(subway!.mediaItems.length > 0);

  // 그룹 결과가 서로 독립적으로 groupId에 귀속
  const ids = new Set(result.groups.map((g) => g.groupId));
  assert.equal(ids.size, 3);
});

test("matchRfpProposalBrief: excludedMediaIds + includedByGroup", async () => {
  const brief = normalizeRfpProposalBrief({
    groups: [
      {
        id: "g1",
        label: "공항 권역",
        regionKeywords: ["인천공항"],
        mediaTypeKeywords: ["DOOH"],
      },
    ],
  });
  assert.ok(brief);
  // normalize may rewrite id — use actual
  const groupId = brief!.groups[0]!.id;

  const excluded = await matchRfpProposalBrief(brief!, {
    catalog,
    limitPerGroup: 5,
    excludedByGroup: { [groupId]: ["airport-t1-sign"] },
  });
  assert.ok(
    !excluded.groups[0]!.mediaItems.some((m) => m.mediaId === "airport-t1-sign"),
  );

  const pinned = await matchRfpProposalBrief(brief!, {
    catalog,
    limitPerGroup: 5,
    includedByGroup: { [groupId]: ["busan-billboard"] },
  });
  assert.equal(pinned.groups[0]!.mediaItems[0]?.mediaId, "busan-billboard");
  assert.equal(pinned.groups[0]!.mediaItems[0]?.pinned, true);
});
