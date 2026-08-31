/**
 * A-1b(Wave 0~4) 최종 확인 — Preview 체크리스트를 코드로 훑는다.
 *
 * A-1 Wave 4 의 `wave4-preview-checklist.test.ts` 와 같은 목적이다 — 개별
 * Wave 에서는 안 보이던 통합 단계 문제를 병합 직전에 한 번에 잡는다. 다만
 * A-1 Wave 4 체크리스트는 plan-cart 경로(`buildOohReportPayload` 직접 호출)를
 * 재현하는 반면, A-1b 는 **브리프 경로**(`buildBriefReportPayload`)를 다뤘으므로
 * 이 파일은 브리프 경로로 재현한다.
 *
 * 「고려 캠페인」 픽스처는 Wave 0(`korea-campaign-fixture.test.ts`)과 동일한
 * 3매체·21일·700만 구성이다 — 다른 파일이라 숫자를 다시 못박는다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { CAMPAIGN_PLAN_ENGINE_VERSION } from "@/lib/campaign-plan-schema";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id,
    nameEn: o.id,
    location: "서울",
    locationEn: "Seoul",
    region: "seoul",
    type: "digital",
    price: 0,
    lat: 37.5,
    lng: 127,
    dailyFootTraffic: 0,
    sampleImages: [],
    ...o,
  } as MediaItem;
}

const CAMPAIGN_DAYS = 21;
const FLIGHT_START = "2026-09-01";
const FLIGHT_END = "2026-09-21";
const BUDGET_WON = 7_000_000;
const NETWORK_UNITS = 50;

const CATALOG: MediaItem[] = [
  media({
    id: "m1",
    name: "서울대입구역 맥스비전",
    type: "digital",
    price: 4_000_000,
    dailyFootTraffic: 165_000,
    city: "서울",
    district: "관악구",
    regionZone: "gwanak",
    regionMain: "seoul",
  }),
  media({
    id: "m2",
    name: "이마트24 네트워크",
    catalogSource: "network",
    networkSubtype: "convenience_store",
    type: "digital",
    price: 2_000_000,
    dailyFootTraffic: 35_000, // 지점당
    networkPricePerUnit: 40_000,
    networkMinUnits: 1,
    networkTotalLocations: 200,
    city: "서울",
    district: "구로구",
    regionZone: "gangseo",
    regionMain: "seoul",
    regionSub: "seoul_guro",
  }),
  media({
    id: "m3",
    name: "홍대입구역 와이드",
    type: "static",
    price: 1_000_000,
    dailyFootTraffic: 90_000,
    city: "서울",
    district: "마포구",
    regionZone: "mapo",
    regionMain: "seoul",
    regionSub: "seoul_hongdae",
  }),
];

const UNITS_BY_ID: Record<string, number> = { m1: 1, m2: NETWORK_UNITS, m3: 1 };
function dailyImpressionsOf(m: MediaItem): number {
  return (m.dailyFootTraffic ?? 0) * (UNITS_BY_ID[m.id] ?? 1);
}
const DAILY_SUM = CATALOG.reduce((s, m) => s + dailyImpressionsOf(m), 0);
const CAMPAIGN_TOTAL = DAILY_SUM * CAMPAIGN_DAYS; // 42,105,000

function koreaCampaignSnapshot(engineVersion: string): CampaignPlanSnapshot {
  return {
    engineVersion,
    brief: {
      budgetWon: BUDGET_WON,
      regionCodes: ["11"],
      genders: [],
      ageBands: ["20s", "30s"],
      goal: "consideration",
      industry: "tech",
      flightStart: FLIGHT_START,
      flightEnd: FLIGHT_END,
    },
    mediaMix: CATALOG.map((m) => ({
      mediaId: m.id,
      name: m.name,
      units: UNITS_BY_ID[m.id] ?? 1,
      days: CAMPAIGN_DAYS,
      priceWon: m.price,
      priceIsEstimate: false,
      impressions: dailyImpressionsOf(m) * CAMPAIGN_DAYS,
      cpmWon: null,
    })),
    metrics: {
      netReach: 0,
      targetPopulation: 0,
      reachRate: 0,
      frequency: 0,
      grp: 0,
      effectiveReach: 0,
      effectiveReachRate: 0,
      totalImpressions: CAMPAIGN_TOTAL,
      mixCpmWon: 1000,
      totalCostWon: BUDGET_WON,
      overBudgetWon: 0,
      budgetUsedRate: 1,
      dataQuality: {
        totalCostWon: "measured",
        totalImpressions: "derived",
        mixCpmWon: "derived",
        netReach: null,
        reachRate: null,
        frequency: null,
        grp: null,
      },
    },
  };
}

function payloadFor(engineVersion: string) {
  return buildBriefReportPayload({
    plan: koreaCampaignSnapshot(engineVersion),
    catalog: CATALOG,
    isKo: true,
  });
}

const CURRENT = payloadFor(CAMPAIGN_PLAN_ENGINE_VERSION);
const STALE = payloadFor("v0-old-simulated");

function kpiTotal(p: ReturnType<typeof payloadFor>): number {
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.ok(kpi, "1p 총 예상 노출 KPI 가 있어야 한다");
  return Number(kpi.value.replace(/[^\d]/g, ""));
}

// ── [1] 배지 — 구버전 스냅샷에서만 뜬다 ─────────────────────────────────────

test("[1] 배지 — engineVersion 이 현재와 같으면 뜨지 않는다", () => {
  assert.equal(CURRENT.staleEngineNotice, undefined);
});

test("[1] 배지 — engineVersion 이 다르면 뜨고, 정확한 버전 문구를 담는다", () => {
  assert.ok(STALE.staleEngineNotice, "구버전 스냅샷엔 안내가 있어야 한다");
  assert.match(STALE.staleEngineNotice, /v0-old-simulated/);
  // 이중 v 접두사 버그 회귀 방지 (버전 문자열 자체가 이미 "v" 로 시작)
  assert.ok(!STALE.staleEngineNotice.includes("vv0-old-simulated"));
});

test("[1] 배지 — 있고 없고에 관계없이 표시값은 저장값 그대로다", () => {
  assert.equal(kpiTotal(CURRENT), CAMPAIGN_TOTAL);
  assert.equal(kpiTotal(STALE), CAMPAIGN_TOTAL);
  assert.equal(kpiTotal(CURRENT), kpiTotal(STALE));
});

// ── [2] 기간 — 21일로 정확히 표기된다 ────────────────────────────────────────

test("[2] 기간 표기가 21일이다 (1개월로 부풀지 않는다)", () => {
  assert.match(CURRENT.periodDisplay, /21일/);
  assert.match(CURRENT.periodDisplay, /2026-09-01/);
  assert.match(CURRENT.periodDisplay, /2026-09-21/);
});

test("[2] 총노출이 21일치다 (30일치로 계산되면 회귀)", () => {
  assert.equal(kpiTotal(CURRENT), CAMPAIGN_TOTAL);
  assert.notEqual(kpiTotal(CURRENT), DAILY_SUM * 30);
});

// ── [3] 네트워크 매체 카드 — 수량×지점 표시가 정상이다 ──────────────────────

test("[3] 편의점 네트워크 수량 단위가 '지점' 이다", () => {
  const network = CURRENT.portfolio.find((r) => r.name.includes("이마트24"));
  assert.ok(network);
  assert.equal(network.quantityLabel, `${NETWORK_UNITS}지점`);
});

test("[3] 네트워크 카드의 일일 노출이 지점 합산값이다 (지점당 값 아님)", () => {
  const network = CURRENT.portfolio.find((r) => r.name.includes("이마트24"));
  assert.ok(network);
  assert.equal(network.dailyTraffic, 35_000 * NETWORK_UNITS);
  assert.notEqual(network.dailyTraffic, 35_000);
});

// ── [4] 「고려 캠페인」 — 1p == 4p == 상권표 == 저장값 ───────────────────────

test("[4] 1p KPI 총노출 == 저장 스냅샷 총노출", () => {
  assert.equal(kpiTotal(CURRENT), CAMPAIGN_TOTAL);
});

test("[4] 4p 노출 요약 == 1p KPI 총노출", () => {
  const row = (CURRENT.charts?.reachSummary ?? []).find(
    (d) => d.label === "총 실노출(추정)",
  );
  assert.equal(row?.value, kpiTotal(CURRENT));
});

test("[4] 상권 세분화 표 합계 == 1p 총노출", () => {
  const rows = CURRENT.regionSubdivision?.breakdown ?? [];
  assert.ok(rows.length > 0);
  const sum = rows.reduce((s, r) => s + r.totalImpressions, 0);
  assert.equal(sum, kpiTotal(CURRENT));
});

test("[4] 네 값이 모두 같은 하나의 숫자다 (제3의 값 없음)", () => {
  const summaryRow = (CURRENT.charts?.reachSummary ?? []).find(
    (d) => d.label === "총 실노출(추정)",
  );
  const regionSum = (CURRENT.regionSubdivision?.breakdown ?? []).reduce(
    (s, r) => s + r.totalImpressions,
    0,
  );
  const values = new Set([
    kpiTotal(CURRENT),
    summaryRow?.value,
    regionSum,
    CAMPAIGN_TOTAL,
  ]);
  assert.equal(values.size, 1, `값이 갈라졌다: ${[...values]}`);
});
