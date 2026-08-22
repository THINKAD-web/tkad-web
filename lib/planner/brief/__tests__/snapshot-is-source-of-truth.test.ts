/**
 * A-1b Wave 3 — 브리프 보고서가 저장 스냅샷을 정본으로 쓰는가 (방식 1).
 *
 * 전환 전에는 `payload-ooh.ts` 의 `usePortfolioReach` 분기 때문에
 * 포트폴리오가 비어있지 않으면 **항상 재계산값**이 이겼고, 어댑터가 넘기던
 * 스냅샷 값은 실사용에서 도달하지 못하는 폴백이었다.
 *
 * 이 파일은 그 전환이 실제로 일어났는지 검사한다. 저장값과 유동인구 유도값이
 * **다른** 스냅샷을 써야만 확인된다 — 둘이 같으면 어느 쪽을 쓰든 결과가 같아
 * 배선이 no-op 이어도 통과해 버린다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { CampaignPlanSnapshot } from "@/lib/campaign-plan-schema";
import {
  buildBriefReportPayload,
  staleEngineNoticeFor,
} from "@/lib/planner/brief/brief-report-adapter";
import { CAMPAIGN_PLAN_ENGINE_VERSION } from "@/lib/campaign-plan-schema";

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

const DAYS = 21;

const CATALOG: MediaItem[] = [
  media({
    id: "m1",
    name: "맥스비전",
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
    name: "홍대 와이드",
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

/** 유동인구에서 유도되는 값 — 전환 전 보고서가 쓰던 값 */
const DERIVED_TOTAL = (165_000 + 90_000) * DAYS; // 5,355,000

/**
 * 저장 스냅샷 값 — 일부러 유도값과 다르게 둔다.
 * 저장 시점 이후 매체의 유동인구가 갱신된 상황을 흉내낸다.
 */
const STORED_M1 = 3_000_000;
const STORED_M2 = 1_200_000;
const STORED_TOTAL = STORED_M1 + STORED_M2; // 4,200,000

function snapshot(
  overrides?: Partial<Record<"m1" | "m2", number>>,
): CampaignPlanSnapshot {
  const imp: Record<string, number> = {
    m1: overrides?.m1 ?? STORED_M1,
    m2: overrides?.m2 ?? STORED_M2,
  };
  return {
    engineVersion: "test",
    brief: {
      budgetWon: 5_000_000,
      regionCodes: ["11"],
      genders: [],
      ageBands: ["20s"],
      goal: "consideration",
      industry: "tech",
      flightStart: "2026-09-01",
      flightEnd: "2026-09-21",
    },
    mediaMix: CATALOG.map((m) => ({
      mediaId: m.id,
      name: m.name,
      units: 1,
      days: DAYS,
      priceWon: m.price,
      priceIsEstimate: false,
      impressions: imp[m.id]!,
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
      totalImpressions: imp.m1! + imp.m2!,
      mixCpmWon: 1000,
      totalCostWon: 5_000_000,
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

function payloadOf(s: CampaignPlanSnapshot) {
  return buildBriefReportPayload({ plan: s, catalog: CATALOG, isKo: true });
}

function kpiTotal(p: ReturnType<typeof payloadOf>): number {
  const kpi = p.kpis.find((k) => k.label === "총 예상 노출");
  assert.ok(kpi);
  return Number(kpi.value.replace(/[^\d]/g, ""));
}

// ── 픽스처가 전환을 실제로 구분하는가 ──────────────────────────────────────

test("픽스처의 저장값과 유도값이 서로 다르다", () => {
  assert.notEqual(
    STORED_TOTAL,
    DERIVED_TOTAL,
    "둘이 같으면 배선이 no-op 이어도 나머지 검사가 통과해 버린다",
  );
});

// ── 방식 1 — 표시값이 저장값인가 ───────────────────────────────────────────

test("1p KPI 총노출이 저장 스냅샷 값이다 (유도값이 아니다)", () => {
  const p = payloadOf(snapshot());
  assert.equal(kpiTotal(p), STORED_TOTAL);
  assert.notEqual(kpiTotal(p), DERIVED_TOTAL, "재계산값이 이기면 방식 2 회귀");
});

test("4p 노출 요약도 저장값이다", () => {
  const p = payloadOf(snapshot());
  const row = (p.charts?.reachSummary ?? []).find((d) => d.label === "총 노출");
  assert.equal(row?.value, STORED_TOTAL);
});

test("상권표 합계가 저장 총계와 닫힌다", () => {
  const p = payloadOf(snapshot());
  const rows = p.regionSubdivision?.breakdown ?? [];
  assert.ok(rows.length > 0);
  const sum = rows.reduce((s, r) => s + r.totalImpressions, 0);
  assert.equal(sum, STORED_TOTAL);
});

test("매체별 노출 기여도가 저장 라인값 비율을 따른다", () => {
  const p = payloadOf(snapshot());
  const m1 = p.portfolio.find((r) => r.id === "m1")!;
  const m2 = p.portfolio.find((r) => r.id === "m2")!;

  // 저장 기준 3,000,000 : 1,200,000 = 71.4% : 28.6%
  assert.equal(Math.round(m1.exposureContributionPct ?? 0), 71);
  assert.equal(Math.round(m2.exposureContributionPct ?? 0), 29);

  // 유동인구 기준이었다면 165,000 : 90,000 = 64.7% : 35.3% 였다.
  assert.notEqual(Math.round(m1.exposureContributionPct ?? 0), 65);
});

// ── 폴백 — 저장값이 온전하지 않을 때 ───────────────────────────────────────

test("라인 노출이 하나라도 비어 있으면 전체가 유도 경로로 돌아간다", () => {
  const broken = snapshot();
  // 한 라인만 값이 깨진 상황
  (broken.mediaMix[1] as { impressions: number }).impressions = Number.NaN;

  const p = payloadOf(broken);
  assert.equal(
    kpiTotal(p),
    DERIVED_TOTAL,
    "일부만 저장값을 쓰면 저장 총계와도 유도 총계와도 다른 제3의 값이 된다",
  );
});

test("매체가 없는 스냅샷도 안전하다", () => {
  const empty = snapshot();
  empty.mediaMix = [];
  empty.metrics.totalImpressions = 0;
  const p = payloadOf(empty);
  assert.equal(p.portfolio.length, 0);
});

// ── 엔진 버전 배지 ─────────────────────────────────────────────────────────

test("엔진 버전이 다르면 안내가 붙는다 — 표시값은 그대로", () => {
  const old = snapshot();
  old.engineVersion = "v0-old";

  const p = payloadOf(old);
  assert.ok(p.staleEngineNotice, "버전이 다르면 안내가 있어야 한다");
  // 부분 매치가 아니라 정확한 문구를 검사한다 — 버전 문자열이 이미 "v" 로
  // 시작하므로(`METRICS_ENGINE_VERSION = "v2.0.0"`), 템플릿이 "v" 를 또
  // 붙이면 "vv0-old" 가 되어도 /v0-old/ 부분매치는 통과해 버린다.
  assert.equal(
    p.staleEngineNotice,
    "이 제안서는 이전 계산 로직(v0-old) 기준입니다. 저장 시점 값을 그대로 보여줍니다.",
  );

  // 배지는 표시값에 관여하지 않는다 — 저장값 그대로다.
  assert.equal(kpiTotal(p), STORED_TOTAL);
});

test("버전 문구가 접두사를 중복시키지 않는다 — 실제 버전 상수로 검증", () => {
  // METRICS_ENGINE_VERSION 자체가 이미 "v" 로 시작한다(예: "v2.0.0").
  // 문구가 `v${version}` 형태면 "vv2.0.0" 처럼 접두사가 겹친다.
  const old = snapshot();
  old.engineVersion = "v1.0.0";

  const p = payloadOf(old);
  assert.ok(p.staleEngineNotice);
  assert.ok(
    !p.staleEngineNotice.includes("vv1.0.0"),
    `접두사 중복: ${p.staleEngineNotice}`,
  );
  assert.match(p.staleEngineNotice, /\(v1\.0\.0\)/);
});

test("엔진 버전이 현재와 같으면 안내가 없다", () => {
  const current = snapshot();
  current.engineVersion = CAMPAIGN_PLAN_ENGINE_VERSION;
  assert.equal(payloadOf(current).staleEngineNotice, undefined);
});

test("engineVersion 이 비어 있으면 안내를 만들지 않는다", () => {
  const noVersion = snapshot();
  (noVersion as { engineVersion?: string }).engineVersion = "";
  assert.equal(payloadOf(noVersion).staleEngineNotice, undefined);
});

test("배지 판정은 재계산과 무관하다 — 같은 스냅샷이면 결과가 같다", () => {
  const s = snapshot();
  s.engineVersion = "v0-old";
  assert.equal(payloadOf(s).staleEngineNotice, payloadOf(s).staleEngineNotice);
  assert.equal(
    staleEngineNoticeFor(s, true),
    payloadOf(s).staleEngineNotice,
    "헬퍼 단독 호출과 payload 경유 결과가 같아야 한다",
  );
});
