/**
 * Brief 랭킹 예산 필터·페널티 (P1).
 */

import type { MediaItem } from "@/lib/media-data";
import { calcLineMetrics } from "@/lib/planner/brief/mix-metrics";

export const BUDGET_PENALTY_CAP = 20;
export const BUDGET_WITHIN_MIN_HINT = 5;

type BudgetPartitionRow = { overBudget: boolean };

export function lineCostWonForMedia(
  media: MediaItem,
  days: number,
): number | null {
  const line = calcLineMetrics({ media, units: 1 }, days);
  const cost = line.costWon?.value;
  if (cost == null || !Number.isFinite(cost) || cost <= 0) return null;
  return cost;
}

export function budgetOverPenalty(
  lineCost: number,
  budgetWon: number,
): number {
  if (!(budgetWon > 0) || lineCost <= budgetWon) return 0;
  const ratio = lineCost / budgetWon;
  return Math.min(BUDGET_PENALTY_CAP, Math.round((ratio - 1) * 35));
}

export function isLineWithinBudget(
  lineCost: number | null,
  budgetWon: number,
): boolean {
  if (lineCost == null) return true;
  if (!(budgetWon > 0)) return true;
  return lineCost <= budgetWon;
}

export function partitionScoredByBudget<T extends BudgetPartitionRow>(params: {
  scored: readonly T[];
  budgetWithinOnly: boolean;
}): {
  visible: T[];
  hiddenOverBudgetCount: number;
  withinBudgetCount: number;
} {
  const within = params.scored.filter((s) => !s.overBudget);
  const hiddenOverBudgetCount = params.scored.length - within.length;
  return {
    visible: params.budgetWithinOnly ? within : [...params.scored],
    hiddenOverBudgetCount,
    withinBudgetCount: within.length,
  };
}
