/**
 * 브리프 보고서가 flight 일수를 그대로 쓰는지.
 *
 * 회귀 배경 — `briefPeriodMonths` 가 `Math.round(days / 30)` 으로 일수를
 * 개월로 반올림했다. 보고서 머리말은 flight 날짜에서 "21일" 로 뜨는데
 * 지표는 30일치로 계산돼, 같은 문서 안에서 기간과 숫자가 어긋났다.
 *
 * 경계값(`Math.max(1,…)` / `Math.min(12,…)`) 제거만으로는 고쳐지지 않는다.
 * `Math.round(21/30)` 이 이미 1 을 내기 때문이다. 반올림 자체를 없애야 한다.
 * 그래서 이 테스트는 경계가 아니라 **일수 보존**을 검사한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import { buildBriefReportPayload } from "@/lib/planner/brief/brief-report-adapter";

function media(o: Partial<MediaItem> & Pick<MediaItem, "id">): MediaItem {
  return {
    name: o.id, nameEn: o.id, location: "서울", locationEn: "Seoul",
    region: "seoul", type: "digital", price: 0, lat: 37.5, lng: 127,
    dailyFootTraffic: 0, sampleImages: [], ...o,
  } as MediaItem;
}

const CATALOG: MediaItem[] = [
  media({
    id: "m1", name: "서울대입구역 맥스비전", type: "digital",
    price: 4_000_000, dailyFootTraffic: 165_000,
    city: "서울", district: "관악구", regionZone: "gwanak", regionMain: "seoul",
  }),
  media({
    id: "m2", name: "이마트24 네트워크", type: "digital",
    price: 2_000_000, dailyFootTraffic: 35_000,
    city: "서울", district: "구로구", regionZone: "gangseo",
    regionMain: "seoul", regionSub: "seoul_guro",
  }),
  media({
    id: "m3", name: "홍대입구역 와이드", type: "static",
    price: 1_000_000, dailyFootTraffic: 90_000,
    city: "서울", district: "마포구", regionZone: "mapo",
    regionMain: "seoul", regionSub: "seoul_hongdae",
  }),
];

const DAILY_SUM = 165_000 + 35_000 + 90_000; // 290,000

function snapshotFor(days: number, endDate: string): CampaignPlanSnapshot {
  const total = DAILY_SUM * days;
  return {
    engineVersion: "test",
    brief: {
      budgetWon: 7_000_000, regionCodes: ["11"], genders: [],
      ageBands: ["20s", "30s"], goal: "consideration", industry: "tech",
      flightStart: "2026-09-01", flightEnd: endDate,
    },
    mediaMix: CATALOG.map((m) => ({
      mediaId: m.id, name: m.name, units: 1, days,
      priceWon: m.price, priceIsEstimate: false,
      impressions: (m.dailyFootTraffic ?? 0) * days, cpmWon: null,
    })),
    metrics: {
      netReach: 0, targetPopulation: 0, reachRate: 0, frequency: 0, grp: 0,
      effectiveReach: 0, effectiveReachRate: 0,
      totalImpressions: total, mixCpmWon: 1000,
      totalCostWon: 7_000_000, overBudgetWon: 0, budgetUsedRate: 1,
      dataQuality: {
        totalCostWon: "measured", totalImpressions: "derived",
        mixCpmWon: "derived", netReach: null, reachRate: null,
        frequency: null, grp: null,
      },
    },
  };
}

function totalImpressionsOf(days: number, endDate: string): number {
  const p = buildBriefReportPayload({
    plan: snapshotFor(days, endDate), catalog: CATALOG, isKo: true,
  });
  const summary = p.charts?.reachSummary ?? [];
  const total = summary.find((d) => d.label === "총 실노출(추정)");
  assert.ok(total, "총 실노출(추정) 요약이 있어야 한다");
  return total.value;
}

test("21일 브리프 — 총노출이 30일치로 부풀지 않는다", () => {
  const actual = totalImpressionsOf(21, "2026-09-21");
  assert.equal(actual, DAILY_SUM * 21, "21일치여야 한다");
  assert.notEqual(actual, DAILY_SUM * 30, "30일치로 계산되면 회귀");
});

test("21일 브리프 — 1p KPI 와 저장 스냅샷이 일치한다", () => {
  const snapshot = snapshotFor(21, "2026-09-21");
  const p = buildBriefReportPayload({ plan: snapshot, catalog: CATALOG, isKo: true });
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.ok(kpi);
  assert.equal(
    kpi.value,
    snapshot.metrics.totalImpressions.toLocaleString("ko-KR"),
    "1p KPI 가 브리프 엔진 저장값과 달라졌다",
  );
});

test("1개월 정수배가 아닌 기간이 전부 일수대로 계산된다", () => {
  // 30·60·90일만 우연히 맞고 나머지가 틀렸던 것이 회귀의 실체다.
  const cases: Array<[number, string]> = [
    [7, "2026-09-07"],
    [14, "2026-09-14"],
    [21, "2026-09-21"],
    [30, "2026-09-30"],
    [45, "2026-10-15"],
  ];
  for (const [days, end] of cases) {
    assert.equal(
      totalImpressionsOf(days, end),
      DAILY_SUM * days,
      `${days}일 캠페인이 일수대로 계산되지 않았다`,
    );
  }
});

test("기간 표기와 총노출 기준이 서로 맞는다", () => {
  const p = buildBriefReportPayload({
    plan: snapshotFor(21, "2026-09-21"), catalog: CATALOG, isKo: true,
  });
  assert.match(p.periodDisplay, /21일/);
  const total = (p.charts?.reachSummary ?? []).find((d) => d.label === "총 실노출(추정)");
  assert.equal(total?.value, DAILY_SUM * 21);
});

test("매체 라인 금액도 기간에 비례한다", () => {
  const p = buildBriefReportPayload({
    plan: snapshotFor(21, "2026-09-21"), catalog: CATALOG, isKo: true,
  });
  const m1 = p.portfolio.find((r) => r.name.includes("맥스비전"));
  assert.ok(m1);
  // 월 400만 × 21/30 = 280만
  assert.equal(m1.lineTotalLabel, "₩280만");
});
