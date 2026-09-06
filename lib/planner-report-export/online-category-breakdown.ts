import type { MediaItem } from "@/lib/media-data";
import { formatKpiRange } from "@/lib/digital/mix-engine";
import { estimatePerformance } from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import {
  plannerBrowseCategoryKey,
  plannerBrowseCategoryLabels,
} from "@/lib/planner-logic";
import type { PlannerExportOnlineCategoryRow } from "@/lib/planner-report-export/types";

type LineBudget = { mediaId: string; budgetWon: number };

function aggregateReachClicks(
  estimates: ReturnType<typeof estimatePerformance>[],
): { reachLabel: string | null; clicksLabel: string | null } {
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
    reachLabel: hasReach ? formatKpiRange(reachMin, reachMax) : null,
    clicksLabel: hasClicks ? formatKpiRange(clicksMin, clicksMax) : null,
  };
}

/** Group online lines by `mediaMainCategory` with budget share and reach sums. */
export function buildOnlineCategoryRows(
  portfolio: readonly MediaItem[],
  lineBudgets: readonly LineBudget[],
  isKo: boolean,
): PlannerExportOnlineCategoryRow[] {
  const mediaById = new Map(portfolio.map((m) => [m.id, m]));
  const groups = new Map<
    string,
    { budgets: number[]; estimates: ReturnType<typeof estimatePerformance>[] }
  >();

  for (const line of lineBudgets) {
    const media = mediaById.get(line.mediaId);
    if (!media) continue;
    const key = plannerBrowseCategoryKey(media);
    const bucket = groups.get(key) ?? { budgets: [], estimates: [] };
    bucket.budgets.push(line.budgetWon);
    if (hasOnlinePricingSpec(media) && media.onlineSpec) {
      bucket.estimates.push(estimatePerformance(media.onlineSpec, line.budgetWon));
    }
    groups.set(key, bucket);
  }

  const totalBudget = lineBudgets.reduce((s, l) => s + l.budgetWon, 0);
  const rows: PlannerExportOnlineCategoryRow[] = [];

  for (const [key, group] of groups) {
    const labels = plannerBrowseCategoryLabels(key);
    const budgetWon = group.budgets.reduce((a, b) => a + b, 0);
    const perf = aggregateReachClicks(group.estimates);
    rows.push({
      key,
      label: isKo ? labels.labelKo : labels.labelEn,
      lineCount: group.budgets.length,
      budgetWon,
      budgetSharePct:
        totalBudget > 0 ? Math.round((budgetWon / totalBudget) * 1000) / 10 : 0,
      reachLabel: perf.reachLabel,
      clicksLabel: perf.clicksLabel,
    });
  }

  return rows.sort((a, b) => b.budgetWon - a.budgetWon);
}
