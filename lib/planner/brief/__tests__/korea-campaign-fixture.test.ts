/**
 * A-1b Wave 0 — 「고려 캠페인」 회귀 픽스처.
 *
 * 브리프 보고서 전 구간(기간 표기 · 1p KPI · 4p 요약 · 상권표 · 매체 카드)의
 * **현행 출력을 고정**한다. 이후 Wave 2~4 가 값을 움직이면 그 차이가
 * 의도한 변경인지 회귀인지 이 파일에서 드러난다.
 *
 * 기준 시점 — #442(PDF 컬럼) · #443(flight 일수 보존) 이 main 에 들어간 뒤.
 *
 * 네트워크 매체를 **반드시 포함**한다. 수량을 가진 매체가 없으면
 * 카드 표시(지점당)와 기여도(전체 합산)의 괴리가 재현되지 않는다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";
import { collectMediaCardSpecs } from "@/lib/planner-report-export/media-card-layout";

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

/** 이마트24 네트워크 선택 지점 수 */
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
    // 수량 효과의 전제 — 네트워크 카탈로그 항목이어야 units 가 노출에 반영된다.
    catalogSource: "network",
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

const UNITS_BY_ID: Record<string, number> = {
  m1: 1,
  m2: NETWORK_UNITS,
  m3: 1,
};

/** 지점당 유동인구 × 지점 수 — 네트워크는 합산이 실제 노출이다 */
function dailyImpressionsOf(m: MediaItem): number {
  return (m.dailyFootTraffic ?? 0) * (UNITS_BY_ID[m.id] ?? 1);
}

const DAILY_SUM = CATALOG.reduce((s, m) => s + dailyImpressionsOf(m), 0);
const CAMPAIGN_TOTAL = DAILY_SUM * CAMPAIGN_DAYS;

function koreaCampaignSnapshot(): CampaignPlanSnapshot {
  return {
    engineVersion: "test",
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

function payload() {
  return buildBriefReportPayload({
    plan: koreaCampaignSnapshot(),
    catalog: CATALOG,
    isKo: true,
  });
}

function kpiTotalImpressions(p: ReturnType<typeof payload>): number {
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.ok(kpi, "1p 총 예상 노출 KPI 가 있어야 한다");
  return Number(kpi.value.replace(/[^\d]/g, ""));
}

function summaryTotalImpressions(p: ReturnType<typeof payload>): number {
  const row = (p.charts?.reachSummary ?? []).find((d) => d.label === "총 노출");
  assert.ok(row, "4p 총 노출 요약이 있어야 한다");
  return row.value;
}

// ── 고정 1 — 기간 표기 ──────────────────────────────────────────────────────

test("기간 표기가 21일이다", () => {
  const p = payload();
  assert.match(p.periodDisplay, /21일/);
  assert.match(p.periodDisplay, /2026-09-01/);
  assert.match(p.periodDisplay, /2026-09-21/);
});

// ── 고정 2 — 1p 총노출 == 4p 총노출 ────────────────────────────────────────

test("1p KPI 총노출과 4p 노출 요약이 같다", () => {
  const p = payload();
  assert.equal(
    kpiTotalImpressions(p),
    summaryTotalImpressions(p),
    "같은 문서 안에서 1p 와 4p 의 총노출이 어긋났다",
  );
});

// ── 고정 3 — 1p 총노출 == 저장 스냅샷 ──────────────────────────────────────

test("1p 총노출이 저장 스냅샷 총노출과 일치한다", () => {
  const snapshot = koreaCampaignSnapshot();
  const p = payload();
  assert.equal(
    kpiTotalImpressions(p),
    snapshot.metrics.totalImpressions,
    "보고서 재계산값이 브리프 엔진 저장값과 달라졌다",
  );
});

test("총노출이 일수대로 계산된다 (30일치로 부풀지 않는다)", () => {
  const p = payload();
  assert.equal(kpiTotalImpressions(p), CAMPAIGN_TOTAL);
  assert.notEqual(
    kpiTotalImpressions(p),
    DAILY_SUM * 30,
    "30일치로 계산되면 #443 회귀",
  );
});

// ── 고정 4 — 상권표 합계 == 1p 총노출 ──────────────────────────────────────

test("상권 세분화 표 합계가 1p 총노출과 닫힌다", () => {
  const p = payload();
  const rows = p.regionSubdivision?.breakdown ?? [];
  assert.ok(rows.length > 0, "상권 세분화 표가 있어야 한다");

  const sum = rows.reduce((s, r) => s + r.totalImpressions, 0);
  assert.equal(
    sum,
    kpiTotalImpressions(p),
    "상권표 기간노출 합이 1p 총노출과 어긋난다",
  );
});

test("상권 세분화 표에 도달 열이 없다 (C안)", () => {
  const p = payload();
  for (const row of p.regionSubdivision?.breakdown ?? []) {
    assert.equal("uniqueReach" in row, false);
    assert.equal("reach" in row, false);
  }
});

// ── 고정 5 — 네트워크 매체 표시 ────────────────────────────────────────────

test("네트워크 매체의 노출 기여도가 수량을 반영한다", () => {
  const p = payload();
  const network = p.portfolio.find((r) => r.name.includes("이마트24"));
  const billboard = p.portfolio.find((r) => r.name.includes("맥스비전"));
  assert.ok(network && billboard);

  // 35,000 × 50지점 = 1,750,000/일 > 165,000/일
  assert.ok(
    (network.exposureContributionPct ?? 0) >
      (billboard.exposureContributionPct ?? 0),
    "50지점 네트워크의 기여도가 단일 빌보드보다 커야 한다",
  );
});

/**
 * Wave 4 대상 — 현행 동작을 그대로 고정한다.
 *
 * 수량 자체는 이미 표기된다 (`quantityLabel`). 문제는 두 가지다.
 *
 *   1. `dailyTraffic` 은 **지점당** 값인데 카드는 "일일 노출 35,000회" 로
 *      적어, 이 매체 전체의 일 노출로 읽힌다. 실제 합산은 1,750,000 이다.
 *   2. 편의점 네트워크의 단위가 "대" 다. `networkQuantitySuffixForItem` 이
 *      접미사를 못 찾으면 "대" 로 폴백하기 때문이다. 지점이 맞다.
 *
 * 계산은 맞고 **표기가 오해를 부르는** 상태다. Wave 4 에서 이 두 단언이
 * 깨지는 것이 정상이며, 그때 기대값을 교체한다.
 */
test("[Wave 4 전] 네트워크 카드의 일일 노출이 지점당 값이다", () => {
  const p = payload();
  const network = p.portfolio.find((r) => r.name.includes("이마트24"));
  assert.ok(network);

  assert.equal(
    network.dailyTraffic,
    35_000,
    "카드 표시는 지점당 유동인구다 — 합산(1,750,000)이 아니다",
  );
  assert.notEqual(
    network.dailyTraffic,
    35_000 * NETWORK_UNITS,
    "합산으로 바뀌었다면 Wave 4 완료 신호",
  );
});

test("[Wave 4 전] 편의점 네트워크 수량 단위가 '대' 로 폴백된다", () => {
  const p = payload();
  const network = p.portfolio.find((r) => r.name.includes("이마트24"));
  assert.ok(network);

  assert.equal(
    network.quantityLabel,
    "50대",
    "지점 단위 접미사가 없어 '대' 로 폴백한다 — '50지점' 이 되면 Wave 4 완료 신호",
  );
});

test("[Wave 4 전] 카드 스펙에 수량과 일일 노출이 나란히 뜬다", () => {
  const p = payload();
  const network = p.portfolio.find((r) => r.name.includes("이마트24"));
  assert.ok(network);

  const specs = collectMediaCardSpecs(network, true);
  const qty = specs.find((s) => s.label === "수량");
  const daily = specs.find((s) => s.label === "일일 노출");

  assert.equal(qty?.value, "50대");
  assert.equal(
    daily?.value,
    "35,000회",
    "지점당임을 알리는 단서 없이 총량처럼 읽힌다 — Wave 4 대상",
  );
});

// ── 부가 — 금액 ────────────────────────────────────────────────────────────

test("매체 라인 금액이 기간에 비례한다", () => {
  const p = payload();
  const m1 = p.portfolio.find((r) => r.name.includes("맥스비전"));
  assert.ok(m1);
  // 월 400만 × 21/30 = 280만
  assert.equal(m1.lineTotalLabel, "₩280만");
});
