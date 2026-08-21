/**
 * Wave 0 — CalcEngine 소비처 교체 전 `buildOohReportPayload` 출력 고정.
 *
 * A-1 전제는 「금액 변화 없는 순수 리팩터링」이다. 엔진 유닛 테스트만으로는
 * 소비처 교체가 금액을 건드렸는지 알 수 없어, payload 경계에서 직접 못박는다.
 *
 * 스냅샷을 둘로 나눈다.
 *   money       — **1원이라도 다르면 실패.** Wave 1~4 내내 불변이어야 한다.
 *   impressions — Wave 2 에서 `Math.max(1, months)` 클램프가 제거되면
 *                 21일·14일 시나리오의 값이 의도적으로 바뀐다.
 *                 차분을 승인받은 뒤에만 갱신한다.
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

/** 금액 — 엄격 고정 대상 */
function extractMoney(p: PlannerReportExportPayload): Json {
  return {
    budgetMan: p.budgetMan,
    cpmKpi:
      p.kpis
        .filter((k) => /CPM/i.test(k.label))
        .map((k) => `${k.label}=${k.value}`) ?? [],
    charts: {
      budgetSplit: chartMoney(p.charts?.budgetSplit),
      browseBudgetSplit: chartMoney(p.charts?.browseBudgetSplit),
      cpmBars: chartMoney(p.charts?.cpmBars),
      regionBudgetSplit: chartMoney(p.charts?.regionBudgetSplit),
      regionSubdivisionBudgetSplit: chartMoney(
        p.charts?.regionSubdivisionBudgetSplit,
      ),
    },
    portfolio: p.portfolio.map((r) => ({
      id: r.id ?? null,
      name: r.name,
      priceLabel: r.priceLabel ?? null,
      monthlyPriceLabel: r.monthlyPriceLabel ?? null,
      lineTotalLabel: r.lineTotalLabel ?? null,
      budgetContributionPct: r.budgetContributionPct ?? null,
    })),
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
      uniqueReach: r.uniqueReach,
    })),
    regionSubdivision: (p.regionSubdivision?.breakdown ?? []).map((r) => ({
      regionKey: r.regionKey,
      totalImpressions: r.totalImpressions,
      impressionPct: r.impressionPct,
      uniqueReach: r.uniqueReach,
    })),
  };
}

function buildCurrent(): Json {
  const out: Json = {};
  for (const s of SNAPSHOT_SCENARIOS) {
    const payload = buildOohReportPayload(buildScenarioArgs(s));
    out[s.id] = {
      purpose: s.purpose,
      money: extractMoney(payload),
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
  test(`[money] ${s.id} — ${s.purpose}`, () => {
    const expected = (baseline[s.id] as Json).money;
    const actual = (current[s.id] as Json).money;
    assert.deepEqual(
      actual,
      expected,
      `${s.id} 의 금액 출력이 달라졌다. A-1 은 금액을 바꾸지 않는다.`,
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
