import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem, MediaOnlineSpecView } from "@/lib/media-data";
import { EMPTY_BRIEF, type CampaignBriefInput } from "@/lib/planner/brief/types";
import { recommendOnlineCatalogChannels } from "@/lib/planner/recommend-online-catalog";
import { buildOnlineCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";

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
      cpcMin: null,
      cpcMax: null,
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

const catalog: MediaItem[] = [
  onlineItem("ig-1", "인스타그램", {
    targetingOptions: ["goal:AWARENESS", "industry:ECOMMERCE", "age:25-34", "gender:ALL"],
    bestFor: ["신규 브랜드 런칭"],
    minBudget: 1_000_000,
  }),
  onlineItem("naver-1", "네이버 검색광고", {
    targetingOptions: ["goal:AWARENESS", "industry:ECOMMERCE", "age:25-34", "gender:ALL"],
    bestFor: ["브랜드명 검색 방어"],
    cpmMin: null,
    cpmMax: null,
    cpcMin: 300,
    cpcMax: 900,
    minBudget: 5_000_000, // 예산(600만원)으로 채우기 빠듯한 값 — excludedForBudget 유도
  }),
];

const brief: CampaignBriefInput = {
  ...EMPTY_BRIEF,
  goal: "awareness",
  industry: "retail",
  ageBands: ["20s", "30s"],
  genders: [],
  budgetInputWon: 6_000_000,
  budgetMode: "total",
  flightStart: "2026-10-01",
  flightEnd: "2026-10-14",
};

test("buildOnlineCampaignPlanSnapshot — mediaMix는 비고 onlineRecommend에 채널·excludedForBudget이 저장 시점 값 그대로 담긴다", () => {
  const result = recommendOnlineCatalogChannels(
    { goal: "brand", industry: "retail", ageBands: ["20s", "30s"], genders: [], budgetMan: 600, catalog },
    true,
  );
  assert.ok(result.platforms.length > 0, "테스트 전제: 최소 1개 채널은 생존해야 함");

  const snapshot = buildOnlineCampaignPlanSnapshot({ brief, result, isKo: true });

  assert.deepEqual(snapshot.mediaMix, []);
  assert.ok(snapshot.onlineRecommend);
  assert.equal(snapshot.onlineRecommend!.channels.length, result.platforms.length);
  // 값이 저장 시점 그대로인지 — 재계산 없이 1:1로 옮겨졌는지 확인
  const first = snapshot.onlineRecommend!.channels[0]!;
  const firstSrc = result.platforms[0]!;
  assert.equal(first.platform, firstSrc.platform);
  assert.equal(first.budgetWon, firstSrc.budgetMan * 10_000);
  assert.equal(first.estimatedMetricMin, firstSrc.estimatedMetricMin);
  assert.equal(first.estimatedMetricMax, firstSrc.estimatedMetricMax);
  assert.equal(first.metricType, firstSrc.metricType);
  // OOH 개념(도달·GRP)은 정직하게 0 + default/derived basis
  assert.equal(snapshot.metrics.netReach, 0);
  assert.equal(snapshot.metrics.dataQuality.totalImpressions, "default");
});

test("buildBriefReportPayload — onlineRecommend가 있으면 onlyOnline composition으로 분기하고 excludedForBudget을 노출한다", () => {
  const result = recommendOnlineCatalogChannels(
    { goal: "brand", industry: "retail", ageBands: ["20s", "30s"], genders: [], budgetMan: 600, catalog },
    true,
  );
  const snapshot = buildOnlineCampaignPlanSnapshot({ brief, result, isKo: true });

  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog,
    isKo: true,
    channelMode: "digital_only",
  });

  assert.equal(payload.reportComposition, "onlyOnline");
  assert.ok(payload.onlineSection);
  assert.equal(payload.onlineSection!.lines.length, result.platforms.length);
  assert.equal(payload.charts?.budgetSplit?.length, result.platforms.length);

  if (result.excludedForBudget.length > 0) {
    assert.ok(payload.onlineSection!.excludedForBudgetNotice);
    assert.equal(
      payload.onlineSection!.excludedForBudgetLines?.length,
      result.excludedForBudget.length,
    );
  }

  // KPI에 채널 수·배분 예산이 정확히 반영됐는지(저장값 그대로)
  const channelCountKpi = payload.kpis.find((k) => k.value.includes(String(result.platforms.length)));
  assert.ok(channelCountKpi, "채널 수 KPI가 있어야 함");
});

test("buildBriefReportPayload — digital_only 플랜은 OOH 전용 필드(quoteSummary 등)를 만들지 않는다", () => {
  const result = recommendOnlineCatalogChannels(
    { goal: "brand", industry: "retail", ageBands: ["20s", "30s"], genders: [], budgetMan: 600, catalog },
    true,
  );
  const snapshot = buildOnlineCampaignPlanSnapshot({ brief, result, isKo: true });
  const payload = buildBriefReportPayload({
    plan: snapshot,
    catalog,
    isKo: true,
    channelMode: "digital_only",
  });

  assert.equal(payload.quoteSummary, undefined);
  assert.equal(payload.digital, undefined);
  // 퍼널처럼 데이터 없는 섹션을 억지로 만들지 않음
  assert.deepEqual(payload.sections, []);
});
