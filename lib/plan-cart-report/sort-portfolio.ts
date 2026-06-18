import type { MediaItem } from "@/lib/media-data";
import {
  plannerReportCategoryKey,
  resolvePlannerMediaKind,
} from "@/lib/planner-logic";
import {
  planReportRegionKey,
  planReportRegionLabel,
  planReportRegionSortOrder,
} from "@/lib/plan-cart-report/regional-breakdown";

const REPORT_CATEGORY_ORDER = ["digital", "static", "mobile", "other"] as const;
export type PlanCartReportCategoryKey = (typeof REPORT_CATEGORY_ORDER)[number];

const CATEGORY_LABELS: Record<
  PlanCartReportCategoryKey,
  { ko: string; en: string }
> = {
  digital: { ko: "디지털", en: "Digital" },
  static: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  other: { ko: "기타", en: "Other" },
};

function normalizeReportCategoryKey(m: MediaItem): PlanCartReportCategoryKey {
  const key = plannerReportCategoryKey(m);
  if (key === "digital" || key === "network") return "digital";
  if (key === "static") return "static";
  if (key === "mobile") return "mobile";
  const norm = resolvePlannerMediaKind(m);
  if (norm === "digital" || norm === "network") return "digital";
  if (norm === "static") return "static";
  if (norm === "mobile") return "mobile";
  return "other";
}

function categorySortOrder(m: MediaItem): number {
  const key = normalizeReportCategoryKey(m);
  const idx = REPORT_CATEGORY_ORDER.indexOf(key);
  return idx >= 0 ? idx : REPORT_CATEGORY_ORDER.length;
}

/** 보고서·PDF 매체 구성 순서: 지역 → 디지털 → 고정형 → 이동형 → 기타 */
export function sortPlanCartReportPortfolio(
  portfolio: readonly MediaItem[],
): MediaItem[] {
  return [...portfolio].sort((a, b) => {
    const byRegion =
      planReportRegionSortOrder(planReportRegionKey(a)) -
      planReportRegionSortOrder(planReportRegionKey(b));
    if (byRegion !== 0) return byRegion;

    const byType = categorySortOrder(a) - categorySortOrder(b);
    if (byType !== 0) return byType;

    return (a.name ?? "").localeCompare(b.name ?? "", "ko");
  });
}

export type PlanCartReportMediaGroup = {
  regionKey: string;
  regionLabel: string;
  categories: {
    categoryKey: PlanCartReportCategoryKey;
    categoryLabel: string;
    items: MediaItem[];
  }[];
};

/** 지역 → 매체 유형별 그룹 (보고서 UI·페이로드) */
export function groupPlanCartReportPortfolio(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): PlanCartReportMediaGroup[] {
  const sorted = sortPlanCartReportPortfolio(portfolio);
  const regionMap = new Map<string, MediaItem[]>();

  for (const item of sorted) {
    const key = planReportRegionKey(item);
    const list = regionMap.get(key) ?? [];
    list.push(item);
    regionMap.set(key, list);
  }

  const regionKeys = [...regionMap.keys()].sort(
    (a, b) => planReportRegionSortOrder(a) - planReportRegionSortOrder(b),
  );

  return regionKeys.map((regionKey) => {
    const regionItems = regionMap.get(regionKey) ?? [];
    const typeMap = new Map<PlanCartReportCategoryKey, MediaItem[]>();

    for (const item of regionItems) {
      const cat = normalizeReportCategoryKey(item);
      const list = typeMap.get(cat) ?? [];
      list.push(item);
      typeMap.set(cat, list);
    }

    const categories = REPORT_CATEGORY_ORDER.filter(
      (key) => (typeMap.get(key)?.length ?? 0) > 0,
    ).map((categoryKey) => ({
      categoryKey,
      categoryLabel: isKo
        ? CATEGORY_LABELS[categoryKey].ko
        : CATEGORY_LABELS[categoryKey].en,
      items: typeMap.get(categoryKey) ?? [],
    }));

    return {
      regionKey,
      regionLabel: planReportRegionLabel(regionKey, isKo),
      categories,
    };
  });
}

export function flattenPlanCartReportGroups(
  groups: readonly PlanCartReportMediaGroup[],
): MediaItem[] {
  return groups.flatMap((g) => g.categories.flatMap((c) => c.items));
}
