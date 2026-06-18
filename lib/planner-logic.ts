import type { MediaItem } from "@/lib/media-data";
import {
  catalogPriceFieldToPriceMan,
  catalogPriceFieldToWon,
} from "@/lib/media-price-format";

export type PlannerCategory = "digital" | "static" | "mobile";

/** DB `Media.type` · 레거시 값 → 플래너 유형 (매칭용) */
export type PlannerMediaKind = "digital" | "static" | "mobile" | "network";

export function normalizeMediaTypeForPlanner(
  type: string | undefined | null,
): PlannerMediaKind | null {
  if (type == null || typeof type !== "string") return null;
  const t = type.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "network") return "network";
  if (
    t === "digital" ||
    t === "ooh_digital" ||
    t === "led" ||
    t === "signage" ||
    t === "digital_signage" ||
    t === "electronic" ||
    t === "screen"
  ) {
    return "digital";
  }
  if (
    t === "static" ||
    t === "billboard" ||
    t === "outdoor" ||
    t === "wallscape" ||
    t === "print"
  ) {
    return "static";
  }
  if (
    t === "mobile" ||
    t === "transit" ||
    t === "bus" ||
    t === "subway" ||
    t === "transport" ||
    t === "vehicle"
  ) {
    return "mobile";
  }
  return null;
}

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
  const norm = normalizeMediaTypeForPlanner(item.type);
  if (cat === "digital")
    return norm === "digital" || norm === "network";
  if (cat === "static") return norm === "static";
  if (cat === "mobile") return norm === "mobile";
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
  const wonPerMonth = portfolio.reduce(
    (s, m) => s + catalogPriceFieldToWon(m.price),
    0,
  );
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
    score:
      m.dailyFootTraffic /
      Math.max(catalogPriceFieldToPriceMan(m.price), 0.01),
  }));
  scored.sort((a, b) => b.score - a.score);
  const out: MediaItem[] = [];
  let allocated = 0;
  for (const { m } of scored) {
    if (out.length >= maxItems) break;
    const priceMan = catalogPriceFieldToPriceMan(m.price);
    if (allocated + priceMan <= cap) {
      out.push(m);
      allocated += priceMan;
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
    const priceMan = catalogPriceFieldToPriceMan(m.price);
    if (allocated + priceMan <= cap) {
      out.push(m);
      allocated += priceMan;
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
  const samplePriceMan = catalogPriceFieldToPriceMan(sample.price);
  const slotsAtMonth = Math.max(
    1,
    Math.floor(perMonth / Math.max(samplePriceMan, 0.01)),
  );
  return {
    sampleName: sample.name,
    samplePrice: samplePriceMan,
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
      list.reduce((s, m) => s + catalogPriceFieldToWon(m.price), 0) /
      Math.max(list.length, 1);
    const avgD =
      list.reduce((s, m) => s + m.dailyFootTraffic, 0) /
      Math.max(list.length, 1);
    const estImp = Math.max(1, avgD * 30 * visibility);
    const krwMonth = avgP;
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

  // 가격이 0/미입력("문의" 등)인 매체는 그대로 두면 예산 비중 0 → payload 의 valueWon>0
  // 필터에서 통째로 누락되어 도넛이 한 유형(보통 디지털) 100% 로 쏠린다(고정형 누락 버그).
  // → 가격 있는 매체들의 평균 단가를 폴백 가중치로 부여해 모든 유형이 배분에 반영되게 한다.
  // (가격이 모두 있는 일반 플랜은 폴백이 적용되지 않아 동작 동일 — 회귀 없음.)
  const positivePrices = portfolio
    .map((m) => catalogPriceFieldToWon(m.price))
    .filter((won) => won > 0);
  const fallbackWon =
    positivePrices.length > 0
      ? Math.round(positivePrices.reduce((a, b) => a + b, 0) / positivePrices.length)
      : 1;
  const weightOf = (m: MediaItem): number => {
    const won = catalogPriceFieldToWon(m.price);
    return won > 0 ? won : fallbackWon;
  };

  const sums = new Map<string, number>();
  for (const m of portfolio) {
    sums.set(m.type, (sums.get(m.type) ?? 0) + weightOf(m));
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

/**
 * 매체별 가시성 점수를 0~1 로 정규화. DB는 0~4, 일부 mock 은 0~100.
 * 점수 미기입(null/undef) 은 0.5 로 가정.
 */
export function normalizeVisibilityScore(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0.5;
  if (v <= 4) return Math.min(1, v / 4);
  if (v >= 100) return 1;
  return Math.min(1, v / 100);
}

export type PlannerAdvancedMetricsRow = {
  id: string;
  name: string;
  type: string;
  region: string;
  /** 일평균 노출 (= dailyFootTraffic) */
  dailyImpressions: number;
  /** 1개월 노출 (= dailyFootTraffic × 30) */
  monthlyImpressions: number;
  /** 캠페인 총 노출 (= 1개월 × months) */
  totalImpressions: number;
  /** 0~1 정규화 가시성 */
  visibilityNorm: number;
  /** 매체별 OTS (가시성 가중 노출) */
  ots: number;
  /** 매체별 CPM (원 / 1000회) — 카탈로그 단가 기준. null = 단가/노출 없음 */
  cpmKrw: number | null;
};

export type PlannerAdvancedMetrics = {
  /** 캠페인 총 노출 (= sum perMedia.totalImpressions) */
  totalImpressions: number;
  /** 일평균 노출 합계 (= sum dailyFootTraffic) — 차트·요약용 */
  dailyImpressions: number;
  /** 가시성으로 가중한 실질 노출 기회 (OTS) */
  totalOts: number;
  /** 중복 제거 추정 도달 — 지역별 saturation 합 */
  uniqueReach: number;
  /** 1인당 평균 노출 횟수 (도달 0 일 때 1 로 클램프) */
  avgFrequency: number;
  /** CPM (원/1000회). 노출 0 일 때 null. */
  cpmKrw: number | null;
  perMedia: PlannerAdvancedMetricsRow[];
};

/**
 * 도달·빈도·OTS·CPM 시뮬레이션.
 *
 *   - 매체별: imp = dailyFootTraffic × 30 × months, OTS = imp × normalize(visibility)
 *   - 지역별: 같은 지역 매체끼리는 중복 도달이 발생하므로 saturation 모델 적용.
 *     audiencePool_region = max(daily) × periodDays × regionUniqueFactor
 *     reach_region = audiencePool × (1 − exp(−impressions_region / audiencePool))
 *   - 총 도달 = 각 region 의 reach 합 (region 끼리는 독립 가정)
 *   - 빈도 = totalImpressions / uniqueReach (클램프 1 이상)
 *   - CPM = budgetKrw / (totalImpressions / 1000)
 *
 * 모든 결과는 데모 모형이며 실제 캠페인 평가용은 아닙니다.
 */
export function computeAdvancedPlannerMetrics(args: {
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  /** 같은 지역 매체끼리의 도달 중복 할인 계수 (0~1). 작을수록 도달이 작아짐. 기본 0.45. */
  regionUniqueFactor?: number;
}): PlannerAdvancedMetrics | null {
  const { portfolio, budgetMan, months } = args;
  if (portfolio.length === 0 || months <= 0) return null;

  const regionFactor = Math.max(
    0.05,
    Math.min(1, args.regionUniqueFactor ?? 0.45),
  );
  const periodDays = months * 30;

  let totalImpressions = 0;
  let dailyImpressions = 0;
  let totalOts = 0;
  const perMedia: PlannerAdvancedMetricsRow[] = [];
  const regionAgg = new Map<
    string,
    { impressions: number; maxDaily: number }
  >();

  for (const m of portfolio) {
    const daily = Math.max(0, m.dailyFootTraffic ?? 0);
    const monthly = Math.round(daily * 30);
    const total = Math.round(monthly * months);
    const visNorm = normalizeVisibilityScore(m.visibilityScore);
    const ots = Math.round(total * visNorm);

    const priceWon =
      typeof m.price === "number" && Number.isFinite(m.price) && m.price > 0
        ? catalogPriceFieldToWon(m.price)
        : 0;
    const monthlyImp = Math.max(0, monthly);
    const cpmKrw = monthlyImp > 0 && priceWon > 0
      ? Math.round(priceWon / (monthlyImp / 1000))
      : null;

    totalImpressions += total;
    dailyImpressions += daily;
    totalOts += ots;

    const r = regionAgg.get(m.region) ?? { impressions: 0, maxDaily: 0 };
    r.impressions += daily * periodDays;
    if (daily > r.maxDaily) r.maxDaily = daily;
    regionAgg.set(m.region, r);

    perMedia.push({
      id: m.id,
      name: m.name,
      type: m.type,
      region: m.region,
      dailyImpressions: daily,
      monthlyImpressions: monthly,
      totalImpressions: total,
      visibilityNorm: visNorm,
      ots,
      cpmKrw,
    });
  }

  let uniqueReach = 0;
  for (const r of regionAgg.values()) {
    if (r.impressions <= 0 || r.maxDaily <= 0) continue;
    const audiencePool = r.maxDaily * periodDays * regionFactor;
    if (audiencePool <= 0) continue;
    const reach = audiencePool * (1 - Math.exp(-r.impressions / audiencePool));
    uniqueReach += reach;
  }
  uniqueReach = Math.round(uniqueReach);

  const avgFrequency =
    uniqueReach > 0
      ? Math.max(1, Math.round((totalImpressions / uniqueReach) * 10) / 10)
      : 1;

  const budgetKrw = Math.max(0, budgetMan) * 10_000;
  const cpmKrw =
    totalImpressions > 0 && budgetKrw > 0
      ? Math.round(budgetKrw / (totalImpressions / 1000))
      : null;

  return {
    totalImpressions,
    dailyImpressions,
    totalOts,
    uniqueReach,
    avgFrequency,
    cpmKrw,
    perMedia,
  };
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

  const avgMonthlyPriceMan =
    filtered.reduce((s, m) => s + catalogPriceFieldToPriceMan(m.price), 0) /
    filtered.length;
  const blendDailyReach =
    filtered.reduce((s, m) => s + m.dailyFootTraffic, 0) / filtered.length;

  const spendPerMonth = budgetMan / months;
  const intensity = Math.min(
    1.2,
    spendPerMonth / Math.max(avgMonthlyPriceMan, 0.01),
  );
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
    avgMonthlyPrice: avgMonthlyPriceMan,
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
