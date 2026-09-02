import type { OnlineSpecForPricing } from "@/lib/pricing/strategy-types";

export type OnlineSpecRates = Pick<
  OnlineSpecForPricing,
  "cpcMin" | "cpcMax" | "cpmMin" | "cpmMax" | "minBudget"
>;

export function formatRateRange(
  min: number | null,
  max: number | null,
  unit: "CPC" | "CPM",
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return `${unit} ${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원`;
  }
  const v = min ?? max!;
  return `${unit} ${v.toLocaleString("ko-KR")}원~`;
}

/** Reference unit-price label for online detail (CPC/CPM seed ranges). */
export function onlinePricingLabel(spec: OnlineSpecRates): string {
  const parts = [
    formatRateRange(spec.cpcMin, spec.cpcMax, "CPC"),
    formatRateRange(spec.cpmMin, spec.cpmMax, "CPM"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "문의";
}

export function hasOnlinePricingSpec(
  spec: OnlineSpecRates | null | undefined,
): boolean {
  if (!spec) return false;
  return (
    spec.cpcMin != null ||
    spec.cpcMax != null ||
    spec.cpmMin != null ||
    spec.cpmMax != null
  );
}

export type PerformanceEstimate = {
  reachMin: number | null;
  reachMax: number | null;
  clicksMin: number | null;
  clicksMax: number | null;
  basis: string[];
};

/**
 * Mini estimator — only uses seeded CPC/CPM ranges. No invented CVR.
 * Higher rate → lower volume (range endpoints swapped accordingly).
 */
export function estimatePerformance(
  spec: OnlineSpecRates,
  budgetWon: number,
): PerformanceEstimate | null {
  if (!hasOnlinePricingSpec(spec) || !Number.isFinite(budgetWon) || budgetWon <= 0) {
    return null;
  }
  const basis: string[] = [];
  let reachMin: number | null = null;
  let reachMax: number | null = null;
  let clicksMin: number | null = null;
  let clicksMax: number | null = null;

  if (spec.cpmMin != null || spec.cpmMax != null) {
    const lo = spec.cpmMin ?? spec.cpmMax!;
    const hi = spec.cpmMax ?? spec.cpmMin!;
    reachMax = Math.floor((budgetWon / lo) * 1000);
    reachMin = Math.floor((budgetWon / hi) * 1000);
    basis.push(
      `CPM ${lo.toLocaleString("ko-KR")}~${hi.toLocaleString("ko-KR")}원 시드 범위`,
    );
  }
  if (spec.cpcMin != null || spec.cpcMax != null) {
    const lo = spec.cpcMin ?? spec.cpcMax!;
    const hi = spec.cpcMax ?? spec.cpcMin!;
    clicksMax = Math.floor(budgetWon / lo);
    clicksMin = Math.floor(budgetWon / hi);
    basis.push(
      `CPC ${lo.toLocaleString("ko-KR")}~${hi.toLocaleString("ko-KR")}원 시드 범위`,
    );
  }

  if (reachMin == null && clicksMin == null) return null;
  return { reachMin, reachMax, clicksMin, clicksMax, basis };
}

/** Single impressions figure for quote lines — prefer reach midpoint, else clicks midpoint. */
export function estimateImpressionsFromBudget(
  spec: OnlineSpecRates,
  budgetWon: number,
): number {
  const est = estimatePerformance(spec, budgetWon);
  if (!est) return 0;
  if (est.reachMin != null && est.reachMax != null) {
    return Math.round((est.reachMin + est.reachMax) / 2);
  }
  if (est.clicksMin != null && est.clicksMax != null) {
    return Math.round((est.clicksMin + est.clicksMax) / 2);
  }
  return est.reachMax ?? est.reachMin ?? est.clicksMax ?? est.clicksMin ?? 0;
}
