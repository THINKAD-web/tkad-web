import type { MediaItem } from "@/lib/media-data";
import {
  MEDIA_BROWSE_REGIONS,
  browseRegionLabel,
} from "@/lib/media-browse-regions";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  isValidRegionZoneId,
  regionZoneLabel,
} from "@/lib/media-regions";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import { calculatePlan } from "@/lib/planner/calc/engine";
import {
  plannerMediaPeriodLineWon,
  resolvePlanPeriodInput,
  type PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";
import type {
  PlannerExportChartDatum,
  PlannerExportRegionBreakdown,
  PlannerExportRegionSubdivision,
} from "@/lib/planner-report-export/types";

export const REGION_SUBDIVISION_UNCLASSIFIED_KEY = "unclassified";

export type RegionSubdivisionSourceField = "regionSub" | "regionZone" | "district";

const FIELD_LABELS: Record<
  RegionSubdivisionSourceField,
  { ko: string; en: string }
> = {
  regionSub: { ko: "상권(발견하기 칩)", en: "District chip (browse)" },
  regionZone: { ko: "서울·수도권 권역", en: "Region zone" },
  district: { ko: "행정구·상권(자유텍스트)", en: "District (free text)" },
};

const SUB_BY_ID = new Map<string, { mainId: string; subId: string }>();
for (const main of MEDIA_BROWSE_REGIONS) {
  for (const sub of main.sub) {
    SUB_BY_ID.set(sub.id, { mainId: main.id, subId: sub.id });
    SUB_BY_ID.set(sub.id.toLowerCase(), { mainId: main.id, subId: sub.id });
  }
}

/** regionSub 값이 browse taxonomy id/라벨/alias 와 정확히 일치할 때만 */
export function resolveBrowseRegionSubId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  for (const main of MEDIA_BROWSE_REGIONS) {
    for (const sub of main.sub) {
      if (sub.id === trimmed || sub.id.toLowerCase() === lower) {
        return sub.id;
      }
      if (sub.label === trimmed) return sub.id;
      if (sub.labelEn && sub.labelEn === trimmed) return sub.id;
      if (sub.aliases?.some((a) => a.toLowerCase() === lower || a === trimmed)) {
        return sub.id;
      }
    }
  }
  return null;
}

function countClassified(
  portfolio: readonly MediaItem[],
  field: RegionSubdivisionSourceField,
): number {
  let n = 0;
  for (const m of portfolio) {
    if (resolveRegionSubdivisionKey(m, field)) n++;
  }
  return n;
}

/** 포트폴리오에서 세분화에 쓸 필드 선택 — 채워진 비율·신뢰도 우선 */
export function pickRegionSubdivisionField(
  portfolio: readonly MediaItem[],
): RegionSubdivisionSourceField | null {
  if (portfolio.length === 0) return null;

  const scores: { field: RegionSubdivisionSourceField; count: number; priority: number }[] = [
    { field: "regionSub", count: countClassified(portfolio, "regionSub"), priority: 3 },
    { field: "regionZone", count: countClassified(portfolio, "regionZone"), priority: 2 },
    { field: "district", count: countClassified(portfolio, "district"), priority: 1 },
  ];

  const best = scores.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.priority - a.priority;
  })[0];

  return best && best.count > 0 ? best.field : null;
}

/** 선택 필드 기준 세분화 키 — 없으면 null (미분류 버킷으로) */
export function resolveRegionSubdivisionKey(
  m: MediaItem,
  field: RegionSubdivisionSourceField,
): string | null {
  if (field === "regionSub") {
    const raw = m.regionSub?.trim();
    if (!raw) return null;
    return resolveBrowseRegionSubId(raw);
  }
  if (field === "regionZone") {
    const raw = m.regionZone?.trim();
    if (!raw || !isValidRegionZoneId(raw)) return null;
    return raw;
  }
  const raw = m.district?.trim();
  if (!raw) return null;
  return raw;
}

export function regionSubdivisionLabel(
  key: string,
  field: RegionSubdivisionSourceField,
  isKo: boolean,
): string {
  if (key === REGION_SUBDIVISION_UNCLASSIFIED_KEY) {
    return isKo ? "미분류" : "Unclassified";
  }
  if (field === "regionSub") {
    const mapped = SUB_BY_ID.get(key);
    if (mapped) {
      return browseRegionLabel(mapped.subId, isKo ? "ko" : "en", "sub", mapped.mainId);
    }
    return key;
  }
  if (field === "regionZone") {
    return regionZoneLabel(key, isKo ? "ko" : "en") ?? key;
  }
  return key;
}

function subdivisionSortOrder(key: string): number {
  if (key === REGION_SUBDIVISION_UNCLASSIFIED_KEY) return 999;
  return 0;
}

export type RegionSubdivisionReport = PlannerExportRegionSubdivision & {
  budgetCharts: PlannerExportChartDatum[];
  impressionCharts: PlannerExportChartDatum[];
};

/** 시·도 매크로 아래 한 단계 — 기존 regionBreakdown 패턴과 동일 지표 */
export function computeRegionSubdivisionReport(
  portfolio: readonly MediaItem[],
  months: number,
  isKo: boolean,
  pricing?: PlannerPortfolioPricing,
): RegionSubdivisionReport | null {
  if (portfolio.length === 0) return null;

  const field = pickRegionSubdivisionField(portfolio);
  if (!field) return null;

  const periodCtx = { months: months > 0 ? months : 1 };
  const plan = calculatePlan({
    media: portfolio.map((item) => ({
      media: item,
      units: pricing?.quantities?.[item.id],
      itemNet: plannerMediaPeriodLineWon(item, periodCtx, pricing, isKo),
      itemImpressions: pricing?.impressions?.[item.id],
    })),
    period: resolvePlanPeriodInput(periodCtx.months, pricing),
    budgetWon: 0,
    locale: isKo ? "ko" : "en",
  });
  const planById = new Map(plan.mediaItems.map((r) => [r.id, r]));

  const groups = new Map<string, MediaItem[]>();
  let classifiedCount = 0;

  for (const item of portfolio) {
    const resolved = resolveRegionSubdivisionKey(item, field);
    const key = resolved ?? REGION_SUBDIVISION_UNCLASSIFIED_KEY;
    if (resolved) classifiedCount++;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const nonUnclassified = [...groups.keys()].filter(
    (k) => k !== REGION_SUBDIVISION_UNCLASSIFIED_KEY,
  );
  if (nonUnclassified.length < 2) return null;

  const totalMonthlyWon = portfolio.reduce(
    (s, item) => s + catalogPriceFieldToWon(item.price),
    0,
  );
  const totalMonthlyImp = plan.impressions.monthlyEquivalent;

  const breakdown: PlannerExportRegionBreakdown[] = [];

  for (const [regionKey, media] of groups.entries()) {
    const monthlyBudgetWon = media.reduce(
      (s, item) => s + catalogPriceFieldToWon(item.price),
      0,
    );
    const planRows = media
      .map((item) => planById.get(item.id))
      .filter((r): r is NonNullable<typeof r> => r != null);

    const monthlyImpressions = planRows.reduce(
      (s, r) => s + r.monthlyImpressions,
      0,
    );
    const totalImpressions = planRows.reduce(
      (s, r) => s + r.campaignImpressions,
      0,
    );
    const periodBudgetWon = planRows.reduce((s, r) => s + r.itemNet, 0);

    breakdown.push({
      regionKey,
      label: regionSubdivisionLabel(regionKey, field, isKo),
      mediaCount: media.length,
      monthlyBudgetWon,
      periodBudgetWon,
      budgetPct:
        totalMonthlyWon > 0
          ? Math.round((monthlyBudgetWon / totalMonthlyWon) * 1000) / 10
          : 0,
      monthlyImpressions,
      totalImpressions,
      impressionPct:
        totalMonthlyImp > 0
          ? Math.round((monthlyImpressions / totalMonthlyImp) * 1000) / 10
          : 0,
      cpmKrw:
        totalImpressions > 0 && periodBudgetWon > 0
          ? Math.round(periodBudgetWon / (totalImpressions / 1000))
          : null,
    });
  }

  breakdown.sort((a, b) => {
    const orderA = subdivisionSortOrder(a.regionKey);
    const orderB = subdivisionSortOrder(b.regionKey);
    if (orderA !== orderB) return orderA - orderB;
    return b.monthlyBudgetWon - a.monthlyBudgetWon;
  });

  const totalCount = portfolio.length;
  const coverageRatio = classifiedCount / totalCount;
  const fieldMeta = FIELD_LABELS[field];
  const sourceFieldLabel = isKo ? fieldMeta.ko : fieldMeta.en;

  let coverageNote: string | undefined;
  if (coverageRatio < 0.5) {
    const unclassified = totalCount - classifiedCount;
    coverageNote = isKo
      ? `${sourceFieldLabel} 정보가 있는 ${classifiedCount}/${totalCount}개 매체 기준 · 미분류 ${unclassified}개`
      : `Based on ${classifiedCount}/${totalCount} media with ${sourceFieldLabel} · ${unclassified} unclassified`;
  } else if (groups.has(REGION_SUBDIVISION_UNCLASSIFIED_KEY)) {
    const unclassified = groups.get(REGION_SUBDIVISION_UNCLASSIFIED_KEY)!.length;
    coverageNote = isKo
      ? `${sourceFieldLabel} 미입력 ${unclassified}개는 미분류로 표시`
      : `${unclassified} without ${sourceFieldLabel} shown as unclassified`;
  }

  const budgetCharts: PlannerExportChartDatum[] = breakdown
    .filter((r) => r.monthlyBudgetWon > 0)
    .map((r) => ({
      label: r.label,
      value: r.monthlyBudgetWon,
      colorKey: r.regionKey,
      pct: r.budgetPct,
    }));

  const impressionCharts: PlannerExportChartDatum[] = breakdown
    .filter((r) => r.monthlyImpressions > 0)
    .map((r) => ({
      label: r.label,
      value: r.monthlyImpressions,
      colorKey: r.regionKey,
      pct: r.impressionPct,
    }));

  return {
    sourceField: field,
    sourceFieldLabel,
    classifiedCount,
    totalCount,
    coverageNote,
    breakdown,
    budgetCharts,
    impressionCharts,
  };
}

/** 진단·테스트용 — 필드별 커버리지 */
export function analyzeRegionDetailCoverage(portfolio: readonly MediaItem[]): {
  total: number;
  regionSub: number;
  regionZone: number;
  district: number;
  picked: RegionSubdivisionSourceField | null;
} {
  return {
    total: portfolio.length,
    regionSub: countClassified(portfolio, "regionSub"),
    regionZone: countClassified(portfolio, "regionZone"),
    district: countClassified(portfolio, "district"),
    picked: pickRegionSubdivisionField(portfolio),
  };
}

export function formatRegionSubdivisionCoveragePct(
  classified: number,
  total: number,
): string {
  if (total <= 0) return "0%";
  return formatPlannerSharePct((classified / total) * 100);
}
