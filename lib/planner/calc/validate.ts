/**
 * PlanResult 사후 정합성 검증 (Phase A-1, STEP 4).
 *
 * `PlanWarning` 과 목적이 다르다.
 *   - `PlanWarning`        : 데이터가 부실하다. 사용자·운영자가 읽는다. 화면에 표시된다.
 *   - `PlanValidationIssue`: 엔진이 스스로의 약속을 어겼다. 개발자가 읽는다.
 *                            **화면·PDF·보고서에 절대 표시하지 않는다.**
 *
 * 타입을 분리한 이유가 이것이다. 같은 배열을 쓰면 "엔진 내부 정합성 오류" 가
 * 광고주 보고서에 섞여 나갈 수 있다.
 *
 * 실패해도 던지지 않는다. 자기 검증 때문에 사용자 보고서가 안 뜨면 본말전도다.
 *   - 테스트  : `assert.equal(report.ok, true)`
 *   - 개발    : console.warn
 *   - 프로덕션: `captureSentryException` (lib/sentry.ts) 로 전송하고 보고서는 정상 렌더
 * 호출 지점은 STEP 5 소비처 연결 때 붙인다.
 */

import {
  PLAN_DAYS_PER_MONTH,
  PLAN_WARNING_KIND,
  type PlanResult,
  type Share,
} from "@/lib/planner/calc/types";

export const PLAN_VALIDATION_CHECKS = [
  "MEDIA_NET_SUM",
  "IMPRESSION_SUM",
  "OTS_SUM",
  "BUDGET_USAGE_SUM",
  "MEDIA_SHARE_CLOSURE",
  "BREAKDOWN_SHARE_CLOSURE",
  "MEDIA_RATIO_LOCK",
  "TOTAL_RATIO_LOCK",
  "SHARE_ORDER_LOCK",
  "PERIOD_INVARIANT",
  "REACH_CONSISTENCY",
  "WARNING_MEDIA_REF",
  "WARNING_KIND_MATCH",
  "BREAKDOWN_COVERAGE",
] as const;

export type PlanValidationCheck = (typeof PLAN_VALIDATION_CHECKS)[number];

/**
 * `ok` 를 false 로 만들지 않는 검사.
 *
 * 커버리지 부족은 엔진 버그가 아니라 **매체 데이터 미매핑** 이다.
 * 수치는 기록하되 엔진 결함으로 보고하지 않는다 (A-4 에서 다룬다).
 */
const INFO_ONLY_CHECKS = new Set<PlanValidationCheck>(["BREAKDOWN_COVERAGE"]);

/** 비중 합 허용 오차 (%p) — 매체별 소수 1자리 반올림 누적분 */
const SHARE_CLOSURE_TOLERANCE_PCT = 0.5;

/** 커버리지가 이 아래로 떨어지면 기록 (%) */
const COVERAGE_FULL_PCT = 99.95;

export type PlanValidationIssue = {
  check: PlanValidationCheck;
  /** 개발자용 진단 문자열. 사용자에게 보여주지 않으므로 영문 단일 */
  message: string;
  expected: number | string;
  actual: number | string;
  delta?: number;
  mediaId?: string;
};

export type PlanValidationReport = {
  /** `INFO_ONLY_CHECKS` 를 제외한 issue 가 하나도 없으면 true */
  ok: boolean;
  issues: PlanValidationIssue[];
  /** 각 집계가 포트폴리오 총 노출의 몇 %를 덮는지 (0~100) */
  coverage: {
    category: number;
    browseCategory: number;
    region: number;
    regionSub: number;
  };
};

function sum(ns: readonly number[]): number {
  return ns.reduce((s, n) => s + n, 0);
}

function coveragePct(rows: readonly Share[], campaignTotal: number): number {
  if (campaignTotal <= 0) return 100;
  const covered = sum(rows.map((r) => r.impressions));
  return Math.round((covered / campaignTotal) * 1000) / 10;
}

export function runValidation(plan: PlanResult): PlanValidationReport {
  const issues: PlanValidationIssue[] = [];
  const add = (issue: PlanValidationIssue) => issues.push(issue);

  const items = plan.mediaItems;
  const campaignTotal = plan.impressions.campaignTotal;

  // ── 합계 정합성 — 정확 일치 ────────────────────────────────────────────────

  const netSum = sum(items.map((m) => m.itemNet));
  if (netSum !== plan.money.mediaNet) {
    add({
      check: "MEDIA_NET_SUM",
      message: "money.mediaNet does not equal the sum of mediaItems[].itemNet",
      expected: netSum,
      actual: plan.money.mediaNet,
      delta: plan.money.mediaNet - netSum,
    });
  }

  const impSum = sum(items.map((m) => m.campaignImpressions));
  if (impSum !== campaignTotal) {
    add({
      check: "IMPRESSION_SUM",
      message:
        "impressions.campaignTotal does not equal the sum of mediaItems[].campaignImpressions",
      expected: impSum,
      actual: campaignTotal,
      delta: campaignTotal - impSum,
    });
  }

  const otsSum = sum(items.map((m) => m.ots));
  if (otsSum !== plan.impressions.ots) {
    add({
      check: "OTS_SUM",
      message:
        "impressions.ots does not equal the sum of mediaItems[].ots",
      expected: otsSum,
      actual: plan.impressions.ots,
      delta: plan.impressions.ots - otsSum,
    });
  }

  if (plan.budgetUsage.usedWon !== plan.money.mediaNet) {
    add({
      check: "BUDGET_USAGE_SUM",
      message: "budgetUsage.usedWon does not equal money.mediaNet",
      expected: plan.money.mediaNet,
      actual: plan.budgetUsage.usedWon,
      delta: plan.budgetUsage.usedWon - plan.money.mediaNet,
    });
  }

  // ── 비중 정합성 — 허용 오차 ±0.5%p ────────────────────────────────────────

  if (items.length > 0 && campaignTotal > 0) {
    const s = sum(items.map((m) => m.impressionShare));
    if (Math.abs(s - 100) > SHARE_CLOSURE_TOLERANCE_PCT) {
      add({
        check: "MEDIA_SHARE_CLOSURE",
        message: "mediaItems[].impressionShare does not close to 100%",
        expected: 100,
        actual: s,
        delta: s - 100,
      });
    }
  }
  if (items.length > 0 && plan.money.mediaNet > 0) {
    const s = sum(items.map((m) => m.budgetShare));
    if (Math.abs(s - 100) > SHARE_CLOSURE_TOLERANCE_PCT) {
      add({
        check: "MEDIA_SHARE_CLOSURE",
        message: "mediaItems[].budgetShare does not close to 100%",
        expected: 100,
        actual: s,
        delta: s - 100,
      });
    }
  }

  const groupings: Array<[string, Share[]]> = [
    ["byCategory", plan.breakdown.byCategory],
    ["byBrowseCategory", plan.breakdown.byBrowseCategory],
    ["byRegion", plan.breakdown.byRegion],
    ["byRegionSub", plan.breakdown.byRegionSub],
  ];

  for (const [name, rows] of groupings) {
    if (rows.length === 0) continue;
    if (sum(rows.map((r) => r.impressions)) > 0) {
      const s = sum(rows.map((r) => r.impressionShare));
      if (Math.abs(s - 100) > SHARE_CLOSURE_TOLERANCE_PCT) {
        add({
          check: "BREAKDOWN_SHARE_CLOSURE",
          message: `breakdown.${name}[].impressionShare does not close to 100%`,
          expected: 100,
          actual: s,
          delta: s - 100,
        });
      }
    }
    if (sum(rows.map((r) => r.budgetAmount)) > 0) {
      const s = sum(rows.map((r) => r.budgetShare));
      if (Math.abs(s - 100) > SHARE_CLOSURE_TOLERANCE_PCT) {
        add({
          check: "BREAKDOWN_SHARE_CLOSURE",
          message: `breakdown.${name}[].budgetShare does not close to 100%`,
          expected: 100,
          actual: s,
          delta: s - 100,
        });
      }
    }
  }

  // ── 파생 비율 고정 ────────────────────────────────────────────────────────

  for (const m of items) {
    const expectedMonthly = m.dailyImpressions * PLAN_DAYS_PER_MONTH;
    if (Math.abs(expectedMonthly - m.monthlyImpressions) > 1e-6) {
      add({
        check: "MEDIA_RATIO_LOCK",
        message: "dailyImpressions × 30 does not equal monthlyImpressions",
        expected: m.monthlyImpressions,
        actual: expectedMonthly,
        delta: expectedMonthly - m.monthlyImpressions,
        mediaId: m.id,
      });
    }

    const expectedCampaign = Math.round(m.dailyImpressions * plan.period.days);
    if (expectedCampaign !== m.campaignImpressions) {
      add({
        check: "MEDIA_RATIO_LOCK",
        message:
          "dailyImpressions × period.days does not equal campaignImpressions",
        expected: expectedCampaign,
        actual: m.campaignImpressions,
        delta: m.campaignImpressions - expectedCampaign,
        mediaId: m.id,
      });
    }
  }

  // 최상위는 daily·monthlyEquivalent 가 각각 반올림돼 있어 오차를 허용한다.
  // round(x) vs round(30x)/30 → 최대 약 0.52. 여유를 둬 1.0 으로 잡는다.
  const impliedDaily = plan.impressions.monthlyEquivalent / PLAN_DAYS_PER_MONTH;
  if (Math.abs(impliedDaily - plan.impressions.daily) > 1) {
    add({
      check: "TOTAL_RATIO_LOCK",
      message:
        "impressions.daily and impressions.monthlyEquivalent are not the same quantity",
      expected: impliedDaily,
      actual: plan.impressions.daily,
      delta: plan.impressions.daily - impliedDaily,
    });
  }

  // 노출 순위와 비중 순위의 **엄격한 역전** 만 잡는다.
  // impressionShare 는 소수 1자리 반올림이라 근소한 차이가 동률이 될 수 있고,
  // 동률은 정상이다. 완전 일치로 검사하면 정상 상황에서 실패한다.
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i]!;
      const b = items[j]!;
      const higherDaily =
        a.dailyImpressions > b.dailyImpressions
          ? a
          : b.dailyImpressions > a.dailyImpressions
            ? b
            : null;
      if (higherDaily == null) continue;
      const lower = higherDaily === a ? b : a;
      if (higherDaily.impressionShare < lower.impressionShare) {
        add({
          check: "SHARE_ORDER_LOCK",
          message: `${higherDaily.id} has more daily impressions than ${lower.id} but a smaller impressionShare`,
          expected: `${higherDaily.id} >= ${lower.id}`,
          actual: `${higherDaily.impressionShare} < ${lower.impressionShare}`,
          mediaId: higherDaily.id,
        });
      }
    }
  }

  // ── 기간·도달 불변식 ──────────────────────────────────────────────────────

  if (!Number.isInteger(plan.period.days) || plan.period.days < 1) {
    add({
      check: "PERIOD_INVARIANT",
      message: "period.days must be an integer >= 1",
      expected: ">= 1 (integer)",
      actual: plan.period.days,
    });
  }
  const expectedMonths = plan.period.days / PLAN_DAYS_PER_MONTH;
  if (Math.abs(expectedMonths - plan.period.monthsEquivalent) > 1e-9) {
    // 반올림·클램프가 되살아나면 여기서 걸린다 (21일 → 1개월 회귀 방지).
    add({
      check: "PERIOD_INVARIANT",
      message:
        "period.monthsEquivalent is not days / 30 — a rounding or clamp was reintroduced",
      expected: expectedMonths,
      actual: plan.period.monthsEquivalent,
      delta: plan.period.monthsEquivalent - expectedMonths,
    });
  }

  if (plan.reach.status === "estimating") {
    if (
      plan.reach.value !== null ||
      plan.reach.frequency !== null ||
      plan.reach.model !== null
    ) {
      add({
        check: "REACH_CONSISTENCY",
        message:
          'reach.status is "estimating" but value/frequency/model are not all null',
        expected: "null, null, null",
        actual: `${plan.reach.value}, ${plan.reach.frequency}, ${plan.reach.model}`,
      });
    }
  } else if (plan.reach.value == null || plan.reach.value <= 0) {
    add({
      check: "REACH_CONSISTENCY",
      message: 'reach.status is "modeled" but value is missing or not positive',
      expected: "> 0",
      actual: String(plan.reach.value),
    });
  }

  // ── 참조 무결성 ───────────────────────────────────────────────────────────

  const ids = new Set(items.map((m) => m.id));
  for (const w of plan.warnings) {
    if (w.mediaId != null && !ids.has(w.mediaId)) {
      add({
        check: "WARNING_MEDIA_REF",
        message: `warning ${w.code} references a media id not present in mediaItems`,
        expected: "an id in mediaItems",
        actual: w.mediaId,
        mediaId: w.mediaId,
      });
    }
    const expectedKind = PLAN_WARNING_KIND[w.code];
    if (w.kind !== expectedKind) {
      add({
        check: "WARNING_KIND_MATCH",
        message: `warning ${w.code} carries kind "${w.kind}" but the registry says "${expectedKind}"`,
        expected: expectedKind,
        actual: w.kind,
      });
    }
  }

  // ── 집계 커버리지 (정보성) ────────────────────────────────────────────────

  const coverage = {
    category: coveragePct(plan.breakdown.byCategory, campaignTotal),
    browseCategory: coveragePct(plan.breakdown.byBrowseCategory, campaignTotal),
    region: coveragePct(plan.breakdown.byRegion, campaignTotal),
    regionSub: coveragePct(plan.breakdown.byRegionSub, campaignTotal),
  };

  for (const [name, pct] of Object.entries(coverage)) {
    if (pct < COVERAGE_FULL_PCT) {
      add({
        check: "BREAKDOWN_COVERAGE",
        message: `breakdown.${name} covers only ${pct}% of campaign impressions — some media are unmapped`,
        expected: 100,
        actual: pct,
        delta: pct - 100,
      });
    }
  }

  return {
    ok: issues.every((i) => INFO_ONLY_CHECKS.has(i.check)),
    issues,
    coverage,
  };
}
