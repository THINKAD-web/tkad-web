/**
 * Step 2 실시간 지표 — 커스텀 라인 반영.
 *
 * catalog-only `calcMixMetrics` 결과에 custom 금액만 합산한다.
 * impressions / reach / CPM 은 catalog 기준 유지, custom 포함 시 CPM null.
 */

import type { MixMetrics } from "@/lib/planner/brief/mix-metrics";
import {
  sumBriefCustomLinesTotalWon,
  type BriefCustomLine,
} from "@/lib/planner/brief/custom-lines";
import { countMixUnits } from "@/lib/planner/brief/brief-fingerprint";

export function hasBriefMixContent(
  mixUnits: Record<string, number>,
  customLines: readonly BriefCustomLine[],
): boolean {
  return countMixUnits(mixUnits) > 0 || customLines.length > 0;
}

export function applyCustomLinesToMixMetrics(
  catalogMetrics: MixMetrics,
  customLines: readonly BriefCustomLine[],
): MixMetrics {
  if (customLines.length === 0) return catalogMetrics;

  const customTotalWon = sumBriefCustomLinesTotalWon(customLines);
  const totalCostWon = catalogMetrics.totalCostWon.value + customTotalWon;
  const budgetWon = catalogMetrics.budgetWon;
  const overBudgetWon = Math.max(0, totalCostWon - budgetWon);
  const budgetUsedRate = budgetWon > 0 ? totalCostWon / budgetWon : 0;

  return {
    ...catalogMetrics,
    totalCostWon: {
      value: totalCostWon,
      basis: catalogMetrics.totalCostWon.basis,
    },
    mixCpmWon: { value: null, basis: "default" },
    budgetUsedRate,
    overBudgetWon,
    isOverBudget: overBudgetWon > 0,
  };
}
