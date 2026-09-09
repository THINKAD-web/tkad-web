import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import {
  estimatePerformance,
  type OnlineSpecRates,
  type PerformanceEstimate,
} from "@/lib/pricing/online-performance-estimate";

export type AggregatedPerformance = {
  reachMin: number | null;
  reachMax: number | null;
  clicksMin: number | null;
  clicksMax: number | null;
};

export type DigitalLineForEstimate = {
  spec: OnlineSpecRates | null | undefined;
  budgetWon: number;
};

/** Sum channel-level estimatePerformance ranges for a multi-product report. */
export function aggregatePerformanceEstimates(
  lines: DigitalLineForEstimate[],
): AggregatedPerformance {
  const estimates: (PerformanceEstimate | null)[] = lines.map(({ spec, budgetWon }) =>
    spec ? estimatePerformance(spec, budgetWon) : null,
  );

  let reachMin = 0;
  let reachMax = 0;
  let clicksMin = 0;
  let clicksMax = 0;
  let hasReach = false;
  let hasClicks = false;

  for (const est of estimates) {
    if (!est) continue;
    if (est.reachMin != null && est.reachMax != null) {
      reachMin += est.reachMin;
      reachMax += est.reachMax;
      hasReach = true;
    }
    if (est.clicksMin != null && est.clicksMax != null) {
      clicksMin += est.clicksMin;
      clicksMax += est.clicksMax;
      hasClicks = true;
    }
  }

  return {
    reachMin: hasReach ? reachMin : null,
    reachMax: hasReach ? reachMax : null,
    clicksMin: hasClicks ? clicksMin : null,
    clicksMax: hasClicks ? clicksMax : null,
  };
}

export function totalBudgetWon(payload: CampaignBuilderPayload): number {
  const budgets = [
    ...payload.digitalLines.map((line) => line.budgetWon),
    ...payload.oohLines.map((line) => line.priceWon ?? 0),
    ...payload.customLines.map((line) => line.budgetWon),
  ];
  return budgets.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}
