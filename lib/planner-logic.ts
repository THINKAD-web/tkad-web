import type { MediaItem } from "@/lib/media-data";

export type PlannerCategory = "digital" | "static" | "mobile";

/** 지도·다중 선택용 (전국 패널은 `national`) */
export const PLANNER_MAP_REGIONS = [
  "seoul",
  "busan",
  "jeju",
  "national",
] as const;

export type PlannerMapRegion = (typeof PLANNER_MAP_REGIONS)[number];

export type PlannerCampaignGoal =
  | "brand"
  | "launch"
  | "event"
  | "sales"
  | "local";

export function matchesPlannerCategory(
  item: MediaItem,
  cat: PlannerCategory,
): boolean {
  if (cat === "digital")
    return item.type === "digital" || item.type === "network";
  if (cat === "static") return item.type === "static";
  if (cat === "mobile") return item.type === "mobile";
  return false;
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

/** 다중 지역(OR). `regions`가 비어 있으면 결과 없음. */
export function filterPlannerMediaMulti(
  items: readonly MediaItem[],
  regions: ReadonlySet<string>,
  categories: ReadonlySet<PlannerCategory>,
): MediaItem[] {
  if (categories.size === 0 || regions.size === 0) return [];
  return items.filter((m) => {
    if (!regions.has(m.region)) return false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) return true;
    }
    return false;
  });
}

export function countPlannerMediaByRegion(
  items: readonly MediaItem[],
  categories: ReadonlySet<PlannerCategory>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of PLANNER_MAP_REGIONS) out[r] = 0;
  if (categories.size === 0) return out;
  for (const m of items) {
    let match = false;
    for (const c of categories) {
      if (matchesPlannerCategory(m, c)) {
        match = true;
        break;
      }
    }
    if (!match) continue;
    if (out[m.region] !== undefined) out[m.region] += 1;
  }
  return out;
}

/** 예산 대비 효율로 조합 추천 (월 합산 단가가 spend 상한에 맞게) */
/** 포트폴리오 월 단가(만원) 대비 예상 월간 노출로 블렌드 CPM(원/천회) 추정 */
export function plannerBlendCpmKrw(
  portfolio: readonly MediaItem[],
  estimatedMonthlyImpressions: number,
): number | null {
  if (portfolio.length === 0 || estimatedMonthlyImpressions <= 0) return null;
  const sumMan = portfolio.reduce((s, m) => s + m.price, 0);
  const wonPerMonth = sumMan * 10_000;
  return Math.round(wonPerMonth / (estimatedMonthlyImpressions / 1000));
}

export function selectPlannerPortfolio(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
  maxItems = 6,
): MediaItem[] {
  if (filtered.length === 0 || months <= 0 || budgetMan < 1) return [];
  const spendPerMonth = budgetMan / months;
  const cap = spendPerMonth * 0.92;
  const scored = filtered.map((m) => ({
    m,
    score: m.dailyFootTraffic / Math.max(m.price, 1),
  }));
  scored.sort((a, b) => b.score - a.score);
  const out: MediaItem[] = [];
  let allocated = 0;
  for (const { m } of scored) {
    if (out.length >= maxItems) break;
    if (allocated + m.price <= cap) {
      out.push(m);
      allocated += m.price;
    }
  }
  if (out.length === 0) {
    const cheapest = [...filtered].sort((a, b) => a.price - b.price)[0];
    if (cheapest) out.push(cheapest);
  }
  return out;
}

/** 사용자가 고른 순서를 유지하며 월 예산 상한 내에서 슬롯 구성 */
export function portfolioFromManualSelection(
  orderedItems: MediaItem[],
  budgetMan: number,
  months: number,
  maxItems = 12,
): MediaItem[] {
  if (orderedItems.length === 0 || months <= 0 || budgetMan < 1) return [];
  const spendPerMonth = budgetMan / months;
  const cap = spendPerMonth * 0.92;
  const out: MediaItem[] = [];
  let allocated = 0;
  for (const m of orderedItems) {
    if (out.length >= maxItems) break;
    if (allocated + m.price <= cap) {
      out.push(m);
      allocated += m.price;
    }
  }
  if (out.length === 0) {
    const cheapest = [...orderedItems].sort((a, b) => a.price - b.price)[0];
    if (cheapest) out.push(cheapest);
  }
  return out;
}

export type BudgetBlurbParts = {
  sampleName: string;
  samplePrice: number;
  slotsAtMonth: number;
};

/** 추천 문구용: 대표 매체 1건과 “월 예산으로 몇 슬롯” 가늠 */
export function computeBudgetBlurbParts(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
): BudgetBlurbParts | null {
  if (filtered.length === 0 || months <= 0 || budgetMan < 1) return null;
  const perMonth = budgetMan / months;
  const pool = [...filtered].sort(
    (a, b) => a.price - b.price || b.dailyFootTraffic - a.dailyFootTraffic,
  );
  const sample = pool.find((m) => m.price > 0) ?? pool[0];
  if (!sample) return null;
  const slotsAtMonth = Math.max(1, Math.floor(perMonth / Math.max(sample.price, 1)));
  return {
    sampleName: sample.name,
    samplePrice: sample.price,
    slotsAtMonth,
  };
}

export type CategoryBarPoint = { key: string; labelKo: string; labelEn: string; daily: number };

const TYPE_META: Record<
  string,
  { labelKo: string; labelEn: string }
> = {
  digital: { labelKo: "디지털", labelEn: "Digital" },
  static: { labelKo: "고정형", labelEn: "Static" },
  mobile: { labelKo: "이동형", labelEn: "Mobile" },
  network: { labelKo: "네트워크", labelEn: "Network" },
};

export function portfolioDailyByCategory(portfolio: MediaItem[]): CategoryBarPoint[] {
  const sums = new Map<string, number>();
  for (const m of portfolio) {
    const t = m.type;
    sums.set(t, (sums.get(t) ?? 0) + m.dailyFootTraffic);
  }
  return [...sums.entries()]
    .map(([key, daily]) => ({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      daily,
    }))
    .sort((a, b) => b.daily - a.daily);
}

export type CpmBarPoint = { key: string; labelKo: string; labelEn: string; cpm: number };

export function estimateCpmByCategory(filtered: MediaItem[]): CpmBarPoint[] {
  const groups = new Map<string, MediaItem[]>();
  for (const m of filtered) {
    const t = m.type;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(m);
  }
  const out: CpmBarPoint[] = [];
  const visibility = 0.18;
  for (const [key, list] of groups) {
    if (list.length === 0) continue;
    const avgP =
      list.reduce((s, m) => s + m.price, 0) / Math.max(list.length, 1);
    const avgD =
      list.reduce((s, m) => s + m.dailyFootTraffic, 0) /
      Math.max(list.length, 1);
    const estImp = Math.max(1, avgD * 30 * visibility);
    const krwMonth = avgP; // DB price는 이미 원 단위
    const cpm = krwMonth / (estImp / 1000);
    out.push({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      cpm: Math.round(cpm),
    });
  }
  return out.sort((a, b) => a.cpm - b.cpm);
}

export type BudgetPieSlice = {
  key: string;
  labelKo: string;
  labelEn: string;
  value: number;
  pct: number;
};

export function budgetSplitByCategory(
  portfolio: MediaItem[],
): BudgetPieSlice[] {
  if (portfolio.length === 0) return [];
  const sums = new Map<string, number>();
  for (const m of portfolio) {
    sums.set(m.type, (sums.get(m.type) ?? 0) + m.price);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0) || 1;
  return [...sums.entries()]
    .map(([key, value]) => ({
      key,
      labelKo: TYPE_META[key]?.labelKo ?? key,
      labelEn: TYPE_META[key]?.labelEn ?? key,
      value,
      pct: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}

/** 목표별 “핵심 도달” 비중(데모, 0–100) */
export function reachSplitForGoal(goal: PlannerCampaignGoal | null): {
  corePct: number;
  extendedPct: number;
} {
  const table: Record<PlannerCampaignGoal, [number, number]> = {
    brand: [62, 38],
    launch: [55, 45],
    event: [58, 42],
    sales: [52, 48],
    local: [68, 32],
  };
  const row: [number, number] =
    goal != null && table[goal] != null ? table[goal] : table.brand;
  return { corePct: row[0], extendedPct: row[1] };
}

export type MonthPlanCompare = {
  months: number;
  totalImpressions: number;
  monthlyImpressions: number;
};

export function comparePlansByDuration(
  filtered: MediaItem[],
  budgetMan: number,
  durations: readonly number[],
): MonthPlanCompare[] {
  return durations.map((months) => {
    const m = computePlannerMetrics(filtered, budgetMan, months);
    return {
      months,
      totalImpressions: m?.estimatedTotalImpressions ?? 0,
      monthlyImpressions: m?.estimatedMonthlyImpressions ?? 0,
    };
  });
}

function goalRoiBoost(goal: PlannerCampaignGoal | null): number {
  if (!goal) return 0;
  const t: Record<PlannerCampaignGoal, number> = {
    brand: 0.08,
    launch: 0.12,
    event: 0.1,
    sales: 0.15,
    local: 0.06,
  };
  return t[goal] ?? 0;
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
  /** Scenario ROI ramp over the campaign (reference curve for charting). */
  roiByMonth: {
    month: number;
    conservative: number;
    expected: number;
    optimistic: number;
  }[];
};

/**
 * Demo model: budget (만원), period (months), visibility factor for OOH frequency.
 */
export function computePlannerMetrics(
  filtered: MediaItem[],
  budgetMan: number,
  months: number,
  options?: { campaignGoal?: PlannerCampaignGoal | null },
): PlannerMetrics | null {
  if (filtered.length === 0 || months <= 0 || budgetMan <= 0) return null;

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
  const estimatedTotalImpressions = Math.round(
    estimatedMonthlyImpressions * months,
  );

  const mixBonus =
    (filtered.some((m) => m.type === "digital" || m.type === "network")
      ? 0.25
      : 0) +
    (filtered.some((m) => m.type === "static") ? 0.15 : 0) +
    (filtered.some((m) => m.type === "mobile") ? 0.1 : 0);

  const goalBoost = goalRoiBoost(options?.campaignGoal ?? null);

  const roiMonthsForScale = Math.max(months, 7 / 30);
  const baseRoi =
    2.1 +
    Math.min(2.2, (budgetMan / (450 * roiMonthsForScale)) * 0.45) +
    mixBonus * 0.4 +
    goalBoost;

  const roiExpected = Math.round(baseRoi * 10) / 10;
  const roiConservative = Math.round(baseRoi * 0.82 * 10) / 10;
  const roiOptimistic = Math.round(baseRoi * 1.18 * 10) / 10;

  const cumulativeByMonth: { month: number; impressions: number }[] = [];
  let acc = 0;
  const fullMonths = Math.floor(months + 1e-9);
  const fracRemain = months - fullMonths;
  for (let mo = 1; mo <= fullMonths; mo++) {
    acc += estimatedMonthlyImpressions;
    cumulativeByMonth.push({ month: mo, impressions: acc });
  }
  if (fracRemain > 1e-6) {
    acc += Math.round(estimatedMonthlyImpressions * fracRemain);
    cumulativeByMonth.push({ month: fullMonths + 1, impressions: acc });
  }
  if (cumulativeByMonth.length === 0) {
    cumulativeByMonth.push({
      month: 1,
      impressions: estimatedTotalImpressions,
    });
  }

  const roiSteps = Math.max(1, cumulativeByMonth.length);
  const roiByMonth: PlannerMetrics["roiByMonth"] = [];
  for (let mo = 1; mo <= roiSteps; mo++) {
    const t = roiSteps <= 1 ? 1 : (mo - 1) / (roiSteps - 1);
    const ramp = 0.88 + 0.12 * t;
    roiByMonth.push({
      month: mo,
      conservative: Math.round(roiConservative * ramp * 10) / 10,
      expected: Math.round(roiExpected * ramp * 10) / 10,
      optimistic: Math.round(roiOptimistic * ramp * 10) / 10,
    });
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
    roiByMonth,
  };
}
