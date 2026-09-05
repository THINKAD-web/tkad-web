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
  it("scenario 1 — 런칭 목표 + 이커머스 업종: 인스타그램이 최상위, 무관한 네이버는 제외", () => {
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
    // 수정 1 — 런칭/이커머스/20대와 전혀 안 맞는 네이버(B2B·35-44)는 결과에 없어야 한다
    assert.ok(!result.platforms.some((p) => p.platform === "네이버 검색광고"));
    const totalPct = result.platforms.reduce((s, p) => s + p.budgetPct, 0);
    assert.ok(Math.abs(totalPct - 100) <= 5);
  });

  it("scenario 2 — 전환 목표 + B2B 업종: 네이버가 1위, 무관하지 않은 채널은 순서대로 유지", () => {
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
    const kakaoIdx = result.platforms.findIndex((p) => p.platform === "카카오모먼트");
    const naverIdx = result.platforms.findIndex((p) => p.platform === "네이버 검색광고");
    assert.ok(naverIdx < kakaoIdx);
  });

  it("scenario 3 (수정 3) — 예산이 minBudget에 못 미치는 채널은 제외되고 남은 채널이 전액 재배정받는다", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "sales",
      industry: "tech",
      ageBands: [],
      genders: [],
      budgetMan: 200, // 200만원 — 네이버 minBudget(300만원)에 못 미침
      catalog: MOCK_CATALOG,
    });

    // 네이버는 관련성은 있지만(목표+업종 매칭) 이 예산으로는 집행 불가 — 제외돼야 함
    assert.ok(!result.platforms.some((p) => p.platform === "네이버 검색광고"));
    // 카카오는 애초에 sales/tech와 무관 — 제외돼야 함(수정 1)
    assert.ok(!result.platforms.some((p) => p.platform === "카카오모먼트"));
    // 유일하게 남는 인스타그램(ig-2)이 예산 전액(100%)을 받는다 — 재정규화 확인
    assert.equal(result.platforms.length, 1);
    assert.equal(result.platforms[0].platform, "인스타그램");
    assert.equal(result.platforms[0].budgetPct, 100);
    assert.equal(result.platforms[0].budgetMan, 200);
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
    // brand와 무관한 네이버·ig-2는 빠지고 인스타그램(ig-1)·카카오만 남는다
    assert.equal(result.platforms.length, 2);
    const totalPct = result.platforms.reduce((s, p) => s + p.budgetPct, 0);
    assert.ok(Math.abs(totalPct - 100) <= 5);
  });

  it("수정 1 — 브리프 조건이 전혀 없으면(자유 탐색) 관련성으로 거르지 않는다", () => {
    const result = recommendOnlineCatalogChannels({
      goal: null,
      industry: null,
      ageBands: [],
      genders: [],
      budgetMan: 900,
      catalog: MOCK_CATALOG,
    });
    const platforms = result.platforms.map((p) => p.platform).sort();
    assert.deepEqual(platforms, ["네이버 검색광고", "인스타그램", "카카오모먼트"]);
  });

  it("수정 1 — 조건은 있는데 매칭되는 채널이 하나도 없으면 noRelevantChannels=true, 빈 목록", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "event", // 목 카탈로그엔 TRAFFIC/VISIT 태그도, 이벤트 키워드 bestFor도 없음
      industry: null,
      ageBands: [],
      genders: [],
      budgetMan: 500,
      catalog: MOCK_CATALOG,
    });
    assert.equal(result.platforms.length, 0);
    assert.equal(result.noRelevantChannels, true);
    assert.equal(result.budgetTooSmall, false);
  });

  it("수정 3 — 관련 채널은 있지만 예산이 전부의 minBudget에도 못 미치면 budgetTooSmall=true, 빈 목록", () => {
    const result = recommendOnlineCatalogChannels({
      goal: "sales",
      industry: "tech",
      ageBands: [],
      genders: [],
      budgetMan: 10, // 10만원 — 네이버(300만)도 인스타그램(50만) 기본값도 못 채움
      catalog: MOCK_CATALOG,
    });
    assert.equal(result.platforms.length, 0);
    assert.equal(result.noRelevantChannels, false);
    assert.equal(result.budgetTooSmall, true);
  });

  it("수정 3 회귀 — 다수 후보가 동시에 미달이어도 전멸하지 않고 상위 소수로 수렴한다", () => {
    // 5개 플랫폼, 점수 동일(1점씩), minBudget 100만원. 예산 150만원을 5등분하면
    // 각 30만원 << 100만원이라 전원 미달 — 예전엔 이 라운드에서 5개를 한 번에
    // 다 제거해 결과가 0건이었다(시나리오 A 500만원 재현과 동일한 버그).
    // 하나씩만 제거하면 1개만 남을 때 150만원 전액을 받아 100만원을 채운다.
    const equalCandidates: MediaItem[] = Array.from({ length: 5 }, (_, i) =>
      onlineItem(`equal-${i}`, `플랫폼${i}`, {
        targetingOptions: ["goal:AWARENESS"],
        minBudget: 1_000_000,
      }),
    );
    const result = recommendOnlineCatalogChannels({
      goal: "brand",
      industry: null,
      ageBands: [],
      genders: [],
      budgetMan: 150,
      catalog: equalCandidates,
    });
    assert.equal(result.budgetTooSmall, false);
    assert.equal(result.platforms.length, 1);
    assert.equal(result.platforms[0].budgetMan, 150);
    assert.equal(result.platforms[0].budgetPct, 100);
  });

  it("수정 2 — CPM 있는 상품은 impressions, CPM 없고 CPC만 있으면 clicks로 표시", () => {
    const catalogWithCpcOnly: MediaItem[] = [
      onlineItem("cpm-item", "CPM플랫폼", {
        targetingOptions: ["goal:AWARENESS"],
        cpmMin: 4000,
        cpmMax: 8000,
      }),
      onlineItem("cpc-item", "CPC플랫폼", {
        targetingOptions: ["goal:AWARENESS"],
        cpmMin: null,
        cpmMax: null,
        cpcMin: 300,
        cpcMax: 600,
      }),
    ];
    const result = recommendOnlineCatalogChannels({
      goal: "brand",
      industry: null,
      ageBands: [],
      genders: [],
      budgetMan: 1000,
      catalog: catalogWithCpcOnly,
    });
    const cpmPlatform = result.platforms.find((p) => p.platform === "CPM플랫폼");
    const cpcPlatform = result.platforms.find((p) => p.platform === "CPC플랫폼");
    assert.ok(cpmPlatform);
    assert.ok(cpcPlatform);
    assert.equal(cpmPlatform.metricType, "impressions");
    assert.ok(cpmPlatform.estimatedMetricMin > 0);
    assert.equal(cpcPlatform.metricType, "clicks");
    assert.ok(cpcPlatform.estimatedMetricMin > 0);
    // CPC 상품이 예전처럼 0~0으로 뜨지 않아야 한다
    assert.ok(!(cpcPlatform.estimatedMetricMin === 0 && cpcPlatform.estimatedMetricMax === 0));
  });
});
