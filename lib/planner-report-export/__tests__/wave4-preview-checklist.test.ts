/**
 * Wave 4 최종 확인 — Preview 체크리스트 11항목을 코드로 훑는다.
 *
 * 개별 Wave 에서는 안 보이던 통합 단계 문제를 마지막에 한 번에 잡기 위한
 * 테스트다. 「고려 캠페인」(3매체 · 21일 · 700만) 재현 기준.
 *
 * 4번(서울대입구역 상권)은 **A-4 범위**라 여기서 "해결됨" 으로 검사하지 않는다.
 * 대신 엔진이 그 상황을 감지하고 있는지만 확인한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import {
  SNAPSHOT_SCENARIOS,
  buildScenarioArgs,
} from "@/lib/planner-report-export/__tests__/payload-snapshot-scenarios";

const KOREA = SNAPSHOT_SCENARIOS.find((s) => s.id === "korea-campaign-21d")!;
const payload = buildOohReportPayload(buildScenarioArgs(KOREA));

function wonFromLabel(label: string | undefined): number {
  if (!label) return 0;
  const man = label.match(/₩\s*([\d,]+)\s*만/);
  if (man?.[1]) return Number(man[1].replace(/,/g, "")) * 10_000;
  const won = label.match(/₩\s*([\d,]+)/);
  return won?.[1] ? Number(won[1].replace(/,/g, "")) : 0;
}

test("[1] 1p 총노출 == 4p 총노출 — 보고서 안에 총노출이 하나뿐이다", () => {
  const summary = payload.charts?.reachSummary ?? [];
  const total = summary.find((d) => /총|Total/.test(d.label));
  assert.ok(total, "총 노출 요약이 있어야 한다");
  assert.equal(total.value, 5_082_000);

  // 유형별 노출 비중 합 == 월 노출 (같은 숫자에서 파생됐다는 증거)
  const split = payload.charts?.impressionSplit ?? [];
  const splitSum = split.reduce((s, d) => s + d.value, 0);
  const monthly = summary.find((d) => /월|Monthly/.test(d.label));
  assert.ok(monthly);
  assert.equal(splitSum, monthly.value);
});

test("[2] 기간이 21일로 표기된다 (1개월로 부풀지 않음)", () => {
  assert.equal(payload.periodDisplay, "21일");
});

test("[3] 노출기여 순위 == 일일노출 순위", () => {
  const byDaily = [...payload.portfolio]
    .sort((a, b) => (b.dailyTraffic ?? 0) - (a.dailyTraffic ?? 0))
    .map((r) => r.name);
  const byExposure = [...payload.portfolio]
    .sort(
      (a, b) =>
        (b.exposureContributionPct ?? 0) - (a.exposureContributionPct ?? 0),
    )
    .map((r) => r.name);
  assert.deepEqual(byExposure, byDaily);
});

test("[4] 서울대입구역 상권 — A-4 대상, 여기서 해결됐다고 보지 않는다", () => {
  const row = payload.portfolio.find((r) => r.name.includes("서울대입구역"));
  assert.ok(row, "관악 매체가 보고서에 있어야 한다");
  // 표시 택소노미(planReportRegionKey)는 A-1 에서 건드리지 않았다.
  // 이 항목은 A-4 에서 처리한다 — 여기서는 존재만 확인한다.
});

test("[5] 지역별 표에 도달 열이 없다", () => {
  for (const row of payload.regionBreakdown ?? []) {
    assert.equal("uniqueReach" in row, false);
  }
});

test("[6] 구별 세분화 표에 도달 열이 없다", () => {
  for (const row of payload.regionSubdivision?.breakdown ?? []) {
    assert.equal("uniqueReach" in row, false);
  }
});

test("[7] 상단 요약 도달은 '산정 중' 상태다", () => {
  const reachKpi = payload.kpis.find((k) => /도달|reach/i.test(k.label));
  assert.ok(reachKpi, "도달 KPI 가 있어야 한다");
  assert.equal(reachKpi.status, "pending");
  assert.equal(reachKpi.badge, "pending");
});

test("[8] 지역 표 합계 == 매체 라인 합계", () => {
  const mediaSum = payload.portfolio.reduce(
    (s, r) => s + wonFromLabel(r.lineTotalLabel),
    0,
  );
  const regionSum = (payload.regionBreakdown ?? []).reduce(
    (s, r) => s + r.periodBudgetWon,
    0,
  );
  assert.equal(mediaSum, 4_900_000);
  assert.ok(
    Math.abs(regionSum - mediaSum) <= payload.portfolio.length * 10_000,
    `지역 ${regionSum} vs 매체 ${mediaSum}`,
  );
});

test("[9] 매체별 금액·CPM 이 예산 도넛과 정합한다", () => {
  const donutSum = (payload.charts?.budgetSplit ?? []).reduce(
    (s, d) => s + d.value,
    0,
  );
  const mediaSum = payload.portfolio.reduce(
    (s, r) => s + wonFromLabel(r.lineTotalLabel),
    0,
  );
  assert.equal(donutSum, mediaSum);
});

test("[10] 예산 비중 합이 100% 로 닫힌다", () => {
  const pctSum = payload.portfolio.reduce(
    (s, r) => s + (r.budgetContributionPct ?? 0),
    0,
  );
  assert.ok(Math.abs(pctSum - 100) <= 1, `예산 기여도 합 ${pctSum}`);

  const donutPct = (payload.charts?.budgetSplit ?? []).reduce(
    (s, d) => s + (d.pct ?? 0),
    0,
  );
  assert.ok(Math.abs(donutPct - 100) <= 0.5, `도넛 비중 합 ${donutPct}`);
});

test("[11] 엔진 경고가 보고서 본문으로 새지 않는다", () => {
  // `REACH_NOT_MODELED` 등 데이터 품질 경고는 개발자·운영자용이다.
  // 도달은 이미 KPI 배지가 "산정 중" 으로 알리므로 각주로 중복 표시하지 않는다.
  const bodyText = [
    ...(payload.sections ?? []).flatMap((sec) => [sec.title, ...sec.lines]),
    ...(payload.recommendRationale?.summaryLines ?? []),
    payload.disclaimer,
  ].join(" ");

  for (const code of [
    "REACH_NOT_MODELED",
    "PERIOD_NO_EXACT_RATE_KEY",
    "REGION_SUB_UNMAPPED",
    "IMPRESSIONS_BASIS_CONFLICT",
    "MEDIA_TYPE_UNKNOWN",
    "BUDGET_OVER",
  ]) {
    assert.ok(
      !bodyText.includes(code),
      `경고 코드 ${code} 가 보고서 본문에 노출됐다`,
    );
  }

  // 개발자용 검증 진단도 마찬가지로 새면 안 된다.
  for (const token of ["PlanValidation", "MEDIA_NET_SUM", "SHARE_ORDER_LOCK"]) {
    assert.ok(!bodyText.includes(token), `${token} 이 본문에 노출됐다`);
  }
});
