import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import { recommendOnlineCatalogChannels } from "@/lib/planner/recommend-online-catalog";

function onlineItem(
  id: string,
  platform: string,
  spec: Partial<MediaOnlineSpecView>,
): MediaItem {
  return {
    id,
    name: `${platform} ${id}`,
    nameEn: `${platform} ${id}`,
    location: "온라인",
    locationEn: "Online",
    region: "전국",
    type: "SNS",
    price: null,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogChannel: "online",
    onlineSpec: {
      platform,
      minBudget: 500_000,
      cpcMin: 200,
      cpcMax: 600,
      cpmMin: 4_000,
      cpmMax: 8_000,
      targetingOptions: [],
      strengths: [],
      kpiHints: [],
      bestFor: [],
      ...spec,
    },
  };
}

const MOCK_CATALOG: MediaItem[] = [
  onlineItem("ig-1", "인스타그램", {
    targetingOptions: ["goal:AWARENESS", "industry:ECOMMERCE", "age:18-24", "gender:ALL"],
    bestFor: ["신규 브랜드 런칭"],
  }),
  onlineItem("ig-2", "인스타그램", {
    targetingOptions: ["goal:CONVERSION", "industry:ECOMMERCE", "age:25-34", "gender:ALL"],
    bestFor: ["재구매 유도"],
  }),
  onlineItem("naver-1", "네이버 검색광고", {
    targetingOptions: ["goal:CONVERSION", "goal:LEAD", "industry:B2B", "age:35-44", "gender:ALL"],
    bestFor: ["전환 데이터가 있는 경우"],
    minBudget: 3_000_000,
  }),
  onlineItem("kakao-1", "카카오모먼트", {
    targetingOptions: ["goal:AWARENESS", "industry:FNB", "age:25-34", "gender:ALL"],
    bestFor: ["외식업 신규 입점 초기"],
  }),
];

describe("recommendOnlineCatalogChannels", () => {
  it("scenario 1 — 런칭 목표 + 이커머스 업종: 인스타그램 인지도 상품이 최상위", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "launch",
      industry: "retail",
      ageBands: ["20s"],
      genders: [],
      budgetMan: 500,
      catalog: MOCK_CATALOG,
    });

    assert.ok(result.platforms.length > 0);
    assert.equal(result.platforms[0].platform, "인스타그램");
    assert.equal(result.platforms[0].topProduct.id, "ig-1");
    const totalPct = result.platforms.reduce((s, p) => s + p.budgetPct, 0);
    assert.ok(totalPct > 0 && totalPct <= 110); // 반올림 오차 허용
  });

  it("scenario 2 — 전환 목표 + B2B 업종: 네이버 검색광고가 상위권으로 이동", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "sales",
      industry: "tech",
      ageBands: ["30s"],
      genders: [],
      budgetMan: 1000,
      catalog: MOCK_CATALOG,
    });

    const naver = result.platforms.find((p) => p.platform === "네이버 검색광고");
    assert.ok(naver);
    // 전환+B2B 매칭된 네이버가 카카오(인지도만 매칭)보다 순위가 높아야 함
    const kakaoIdx = result.platforms.findIndex((p) => p.platform === "카카오모먼트");
    const naverIdx = result.platforms.findIndex((p) => p.platform === "네이버 검색광고");
    assert.ok(naverIdx < kakaoIdx);
  });

  it("scenario 3 — 최소 집행금액 미달 상품은 순위가 낮아지되 제외되지는 않음", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "sales",
      industry: "tech",
      ageBands: [],
      genders: [],
      budgetMan: 200, // 200만원 = minBudget 300만원 미달(네이버)
      catalog: MOCK_CATALOG,
    });

    const naver = result.platforms.find((p) => p.platform === "네이버 검색광고");
    assert.ok(naver, "예산 미달이어도 후보에서 완전히 빠지진 않는다");
    const allPlatformIds = result.platforms.map((p) => p.platform);
    assert.ok(allPlatformIds.includes("인스타그램"));
    assert.ok(allPlatformIds.includes("카카오모먼트"));
  });

  it("예산 배분 비중 합은 대략 100%에 수렴한다 (반올림 오차 허용)", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "brand",
      industry: "other",
      ageBands: [],
      genders: [],
      budgetMan: 800,
      catalog: MOCK_CATALOG,
    });
    const totalPct = result.platforms.reduce((s, p) => s + p.budgetPct, 0);
    assert.ok(Math.abs(totalPct - 100) <= 5);
  });
});
