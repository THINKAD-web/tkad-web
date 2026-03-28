import type { MediaItem } from "@/lib/media-data";

export type PlannerCategory = "billboard" | "bus" | "subway";

export function matchesPlannerCategory(
  item: MediaItem,
  cat: PlannerCategory,
): boolean {
  if (cat === "bus") return item.type === "bus";
  if (cat === "subway") return item.type === "subway";
  return item.type === "billboard" || item.type === "digital";
}

export function filterPlannerMedia(
  items: readonly MediaItem[],
  region: "all" | string,
  categories: ReadonlySet<PlannerCategory>,
): MediaItem[] {
  if (categories.size === 0) return [];
  return items.filter((m) => {
    if (region !== "all" && m.region !== region) return false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) return true;
    }
    return false;
  });
}

export type PlannerMetrics = {
  avgMonthlyPrice: number;
  blendDailyReach: number;
  estimatedMonthlyImpressions: number;
  estimatedTotalImpressions: number;
  roiConservative: number;
  roiExpected: number;
  roiOptimistic: number;
  cumulativeByMonth: { month: number; impressions: number }[];
};

/**
 * Demo model: budget (만원), period (months), visibility factor for OOH frequency.
 */
export function computePlannerMetrics(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
): PlannerMetrics | null {
  if (filtered.length === 0 || months < 1 || budgetMan <= 0) return null;

  const avgMonthlyPrice =
    filtered.reduce((s, m) => s + m.price, 0) / filtered.length;
  const blendDailyReach =
    filtered.reduce((s, m) => s + m.dailyFootTraffic, 0) / filtered.length;

  const spendPerMonth = budgetMan / months;
  const intensity = Math.min(1.2, spendPerMonth / Math.max(avgMonthlyPrice, 1));
  const visibility = 0.14 + intensity * 0.1;

  const estimatedMonthlyImpressions = Math.round(
    blendDailyReach * 30 * visibility * Math.min(1, intensity + 0.25),
  );
  const estimatedTotalImpressions = estimatedMonthlyImpressions * months;

  const mixBonus =
    (filtered.some((m) => m.type === "digital" || m.type === "billboard")
      ? 0.25
      : 0) +
    (filtered.some((m) => m.type === "subway") ? 0.15 : 0) +
    (filtered.some((m) => m.type === "bus") ? 0.1 : 0);

  const baseRoi =
    2.1 +
    Math.min(2.2, (budgetMan / (450 * months)) * 0.45) +
    mixBonus * 0.4;

  const roiExpected = Math.round(baseRoi * 10) / 10;
  const roiConservative = Math.round(baseRoi * 0.82 * 10) / 10;
  const roiOptimistic = Math.round(baseRoi * 1.18 * 10) / 10;

  const cumulativeByMonth: { month: number; impressions: number }[] = [];
  let acc = 0;
  for (let mo = 1; mo <= months; mo++) {
    acc += estimatedMonthlyImpressions;
    cumulativeByMonth.push({ month: mo, impressions: acc });
  }

  return {
    avgMonthlyPrice,
    blendDailyReach,
    estimatedMonthlyImpressions,
    estimatedTotalImpressions,
    roiConservative,
    roiExpected,
    roiOptimistic,
    cumulativeByMonth,
  };
}
