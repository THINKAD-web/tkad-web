/**
 * Wave 0 — CalcEngine 소비처 교체 전 `buildOohReportPayload` 출력 고정.
 *
 * A-1 전제는 「금액 변화 없는 순수 리팩터링」이다. 엔진 유닛 테스트만으로는
 * 소비처 교체가 금액을 건드렸는지 알 수 없어, payload 경계에서 직접 못박는다.
 *
 * 스냅샷을 셋으로 나눈다 — 버킷 이름이 곧 갱신 정책이다.
 *   mediaMoney     — 매체 라인 금액. **어떤 Wave 에서도 불변.**
 *   aggregateMoney — 지역·구 집계 금액. Wave 2 에서만 승인 후 갱신.
 *   impressions    — 노출. Wave 2 에서 클램프가 제거되면 의도적으로 바뀐다.
 *
 * 갱신 방법 (승인 후에만):
 *   UPDATE_PAYLOAD_SNAPSHOT=1 npx tsx --test lib/planner-report-export/__tests__/payload-money-snapshot.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type {
  PlannerExportChartDatum,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  SNAPSHOT_SCENARIOS,
  buildScenarioArgs,
} from "@/lib/planner-report-export/__tests__/payload-snapshot-scenarios";

const SNAPSHOT_PATH = join(
  process.cwd(),
  "lib/planner-report-export/__tests__/__snapshots__/payload-money.json",
);

const UPDATE = process.env.UPDATE_PAYLOAD_SNAPSHOT === "1";

type Json = Record<string, unknown>;

function chartMoney(rows: PlannerExportChartDatum[] | undefined): Json[] {
  return (rows ?? []).map((d) => ({
    label: d.label,
    value: d.value,
    pct: d.pct ?? null,
  }));
}

/**
 * 매체 라인 금액 — **Wave 1~4 내내 엄격 고정.**
 *
 * 매체 단가·라인 금액과 그로부터 직접 나오는 카테고리 집계다.
 * 이 경로는 이미 periodCtx 를 타고 있어 기간을 정확히 반영하므로
 * Wave 2 의 클램프 제거에도 값이 움직이지 않아야 한다.
 */
function extractMediaMoney(p: PlannerReportExportPayload): Json {
  return {
    budgetMan: p.budgetMan,
    cpmKpi: p.kpis
      .filter((k) => /CPM/i.test(k.label))
      .map((k) => `${k.label}=${k.value}`),
    charts: {
      budgetSplit: chartMoney(p.charts?.budgetSplit),
      browseBudgetSplit: chartMoney(p.charts?.browseBudgetSplit),
      cpmBars: chartMoney(p.charts?.cpmBars),
    },
    portfolio: p.portfolio.map((r) => ({
      id: r.id ?? null,
      name: r.name,
      priceLabel: r.priceLabel ?? null,
      monthlyPriceLabel: r.monthlyPriceLabel ?? null,
      lineTotalLabel: r.lineTotalLabel ?? null,
      budgetContributionPct: r.budgetContributionPct ?? null,
    })),
  };
}

/**
 * 지역·구 집계 금액 — **Wave 2 에서만** 예상 차분 승인 후 갱신.
 *
 * `regional-breakdown.ts` 의 `Math.max(1, months)` 클램프 때문에
 * 30일 미만 캠페인에서 기간을 반영하지 못하고 있다. 클램프를 제거하면
 * 이 버킷의 금액이 매체 라인 합계와 일치하도록 바뀐다.
 */
function extractAggregateMoney(p: PlannerReportExportPayload): Json {
  return {
    charts: {
      regionBudgetSplit: chartMoney(p.charts?.regionBudgetSplit),
      regionSubdivisionBudgetSplit: chartMoney(
        p.charts?.regionSubdivisionBudgetSplit,
      ),
    },
    regionBreakdown: (p.regionBreakdown ?? []).map((r) => ({
      regionKey: r.regionKey,
      label: r.label,
      mediaCount: r.mediaCount,
      monthlyBudgetWon: r.monthlyBudgetWon,
      periodBudgetWon: r.periodBudgetWon,
      budgetPct: r.budgetPct,
      cpmKrw: r.cpmKrw,
    })),
    regionSubdivision: (p.regionSubdivision?.breakdown ?? []).map((r) => ({
      regionKey: r.regionKey,
      label: r.label,
      monthlyBudgetWon: r.monthlyBudgetWon,
      periodBudgetWon: r.periodBudgetWon,
      budgetPct: r.budgetPct,
      cpmKrw: r.cpmKrw,
    })),
  };
}

/** 노출 — Wave 2 에서 변할 수 있는 값 (별도 추적) */
function extractImpressions(p: PlannerReportExportPayload): Json {
  return {
    impressionKpi: p.kpis
      .filter((k) => !/CPM/i.test(k.label))
      .map((k) => `${k.label}=${k.value}`),
    charts: {
      impressionSplit: chartMoney(p.charts?.impressionSplit),
      browseImpressionSplit: chartMoney(p.charts?.browseImpressionSplit),
      regionImpressionSplit: chartMoney(p.charts?.regionImpressionSplit),
      regionSubdivisionImpressionSplit: chartMoney(
        p.charts?.regionSubdivisionImpressionSplit,
      ),
    },
    portfolio: p.portfolio.map((r) => ({
      id: r.id ?? null,
      dailyTraffic: r.dailyTraffic ?? null,
      exposureContributionPct: r.exposureContributionPct ?? null,
    })),
    regionBreakdown: (p.regionBreakdown ?? []).map((r) => ({
      regionKey: r.regionKey,
      monthlyImpressions: r.monthlyImpressions,
      totalImpressions: r.totalImpressions,
      impressionPct: r.impressionPct,
    })),
    regionSubdivision: (p.regionSubdivision?.breakdown ?? []).map((r) => ({
      regionKey: r.regionKey,
      totalImpressions: r.totalImpressions,
      impressionPct: r.impressionPct,
    })),
  };
}

function buildCurrent(): Json {
  const out: Json = {};
  for (const s of SNAPSHOT_SCENARIOS) {
    const payload = buildOohReportPayload(buildScenarioArgs(s));
    out[s.id] = {
      purpose: s.purpose,
      mediaMoney: extractMediaMoney(payload),
      aggregateMoney: extractAggregateMoney(payload),
      impressions: extractImpressions(payload),
    };
  }
  return out;
}

const current = buildCurrent();

if (UPDATE || !existsSync(SNAPSHOT_PATH)) {
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

const baseline = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Json;

test("스냅샷이 모든 시나리오를 덮는다", () => {
  assert.deepEqual(
    Object.keys(baseline).sort(),
    SNAPSHOT_SCENARIOS.map((s) => s.id).sort(),
  );
});

for (const s of SNAPSHOT_SCENARIOS) {
  test(`[mediaMoney] ${s.id} — ${s.purpose}`, () => {
    const expected = (baseline[s.id] as Json).mediaMoney;
    const actual = (current[s.id] as Json).mediaMoney;
    assert.deepEqual(
      actual,
      expected,
      `${s.id} 의 매체 라인 금액이 달라졌다. 이 버킷은 어떤 Wave 에서도 불변이다.`,
    );
  });

  test(`[aggregateMoney] ${s.id}`, () => {
    const expected = (baseline[s.id] as Json).aggregateMoney;
    const actual = (current[s.id] as Json).aggregateMoney;
    assert.deepEqual(
      actual,
      expected,
      `${s.id} 의 지역·구 집계 금액이 달라졌다. Wave 2 예상 차분인지 확인 후 갱신할 것.`,
    );
  });

  test(`[impressions] ${s.id}`, () => {
    const expected = (baseline[s.id] as Json).impressions;
    const actual = (current[s.id] as Json).impressions;
    assert.deepEqual(
      actual,
      expected,
      `${s.id} 의 노출 출력이 달라졌다. Wave 2 예상 차분인지 확인 후 갱신할 것.`,
    );
  });
}

test("고려 캠페인 21일 — 기간 표기가 30일로 부풀지 않았다", () => {
  const s = SNAPSHOT_SCENARIOS.find((x) => x.id === "korea-campaign-21d")!;
  const payload = buildOohReportPayload(buildScenarioArgs(s));
  assert.equal(payload.periodDisplay, "21일");
});

/**
 * 렌더러 폴백 landmine 가드.
 *
 * `build-pdf.ts` 와 `report-document.tsx` 에는 아래 폴백이 있다.
 *
 *   const pct = d.pct ?? (total > 0 ? (d.value / total) * 100 : 0);
 *
 * payload 가 `pct` 를 빠뜨리면 렌더러가 스스로 비중을 계산한다 —
 * 즉 렌더러가 또 하나의 계산 소스가 되어 A-1 이 없애려던 문제가 되살아난다.
 * 렌더러를 고치는 대신 payload 쪽에서 `pct` 가 항상 있음을 보장한다.
 */
const DONUT_CHART_KEYS = [
  "budgetSplit",
  "browseBudgetSplit",
  "impressionSplit",
  "browseImpressionSplit",
  "regionBudgetSplit",
  "regionImpressionSplit",
  "regionSubdivisionBudgetSplit",
  "regionSubdivisionImpressionSplit",
] as const;

for (const s of SNAPSHOT_SCENARIOS) {
  test(`[pct guard] ${s.id} — 도넛 데이터에 pct 가 빠지지 않았다`, () => {
    const payload = buildOohReportPayload(buildScenarioArgs(s));
    for (const key of DONUT_CHART_KEYS) {
      const rows = payload.charts?.[key];
      if (!rows || rows.length === 0) continue;
      for (const [i, d] of rows.entries()) {
        assert.ok(
          typeof d.pct === "number" && Number.isFinite(d.pct),
          `charts.${key}[${i}] (${d.label}) 에 pct 가 없다 — 렌더러 폴백이 켜진다`,
        );
      }
    }
  });
}

/**
 * Wave 2 조건 2 — 집계 표 금액이 매체 표 합계와 실제로 맞는지.
 *
 * "700만 → 490만으로 바뀌었다" 만 확인하면 부족하다. 바뀐 값이
 * 같은 보고서의 매체 라인 합계와 일치해야 의미가 있다.
 * 이 불일치가 30일 미만 캠페인에서 210만원 어긋남을 만들고 있었다.
 */
function parseWonLabel(label: string | undefined): number | null {
  if (!label) return null;
  const man = label.match(/₩\s*([\d,]+)\s*만/);
  if (man?.[1]) return Number(man[1].replace(/,/g, "")) * 10_000;
  const won = label.match(/₩\s*([\d,]+)/);
  if (won?.[1]) return Number(won[1].replace(/,/g, ""));
  return null;
}

for (const s of SNAPSHOT_SCENARIOS) {
  test(`[합계 일치] ${s.id} — 지역 표 기간 금액 == 매체 라인 합계`, () => {
    const payload = buildOohReportPayload(buildScenarioArgs(s));
    const rows = payload.regionBreakdown ?? [];
    if (rows.length === 0) return;

    const mediaSum = payload.portfolio.reduce((acc, r) => {
      const won = parseWonLabel(r.lineTotalLabel);
      assert.ok(won != null, `${r.name} 의 lineTotalLabel 을 읽지 못했다`);
      return acc + won;
    }, 0);
    const regionSum = rows.reduce((acc, r) => acc + r.periodBudgetWon, 0);

    // 라벨이 만원 단위로 반올림되므로 매체 수만큼의 절사 오차를 허용한다.
    const tolerance = payload.portfolio.length * 10_000;
    assert.ok(
      Math.abs(regionSum - mediaSum) <= tolerance,
      `지역 표 합계 ${regionSum} vs 매체 표 합계 ${mediaSum} (허용 ±${tolerance})`,
    );
  });

  test(`[합계 일치] ${s.id} — 구 세분화 기간 금액 == 매체 라인 합계`, () => {
    const payload = buildOohReportPayload(buildScenarioArgs(s));
    const rows = payload.regionSubdivision?.breakdown ?? [];
    if (rows.length === 0) return;

    const mediaSum = payload.portfolio.reduce(
      (acc, r) => acc + (parseWonLabel(r.lineTotalLabel) ?? 0),
      0,
    );
    const subSum = rows.reduce((acc, r) => acc + r.periodBudgetWon, 0);
    const tolerance = payload.portfolio.length * 10_000;
    assert.ok(
      Math.abs(subSum - mediaSum) <= tolerance,
      `구 세분화 합계 ${subSum} vs 매체 표 합계 ${mediaSum} (허용 ±${tolerance})`,
    );
  });
}
