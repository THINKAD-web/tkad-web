import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  plannerReportCategoryKey,
  resolvePlannerMediaKind,
} from "@/lib/planner-logic";
import {
  planReportRegionKey,
  planReportRegionLabel,
  planReportRegionSortOrder,
} from "@/lib/plan-cart-report/regional-breakdown";

const REPORT_CATEGORY_ORDER = ["dooh", "static", "mobile", "other"] as const;
export type PlanCartReportCategoryKey = (typeof REPORT_CATEGORY_ORDER)[number];

const CATEGORY_LABELS: Record<
  PlanCartReportCategoryKey,
  { ko: string; en: string }
> = {
  dooh: { ko: "디지털", en: "Digital" },
  static: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  other: { ko: "기타", en: "Other" },
};

export type ReportPortfolioOrderOpts = {
  /** 4번 확장 — 명시적 mediaId 순서 (최우선) */
  manualOrder?: readonly string[];
  /** 담은·드래그 순서 */
  cartItems?: readonly Pick<PlanCartItem, "mediaId">[];
};

function normalizeReportCategoryKey(m: MediaItem): PlanCartReportCategoryKey {
  const key = plannerReportCategoryKey(m);
  if (key === "dooh" || key === "network") return "dooh";
  if (key === "static") return "static";
  if (key === "mobile") return "mobile";
  const norm = resolvePlannerMediaKind(m);
  if (norm === "dooh" || norm === "network") return "dooh";
  if (norm === "static") return "static";
  if (norm === "mobile") return "mobile";
  return "other";
}

function categorySortOrder(m: MediaItem): number {
  const key = normalizeReportCategoryKey(m);
  const idx = REPORT_CATEGORY_ORDER.indexOf(key);
  return idx >= 0 ? idx : REPORT_CATEGORY_ORDER.length;
}

function orderPortfolioByIdList(
  portfolio: readonly MediaItem[],
  idOrder: readonly string[],
): MediaItem[] {
  const byId = new Map(portfolio.map((m) => [m.id, m]));
  const ordered: MediaItem[] = [];
  const seen = new Set<string>();
  for (const id of idOrder) {
    const hit = byId.get(id);
    if (!hit || seen.has(hit.id)) continue;
    ordered.push(hit);
    seen.add(hit.id);
  }
  for (const m of portfolio) {
    if (!seen.has(m.id)) ordered.push(m);
  }
  return ordered;
}

/** cart.items 배열 순서대로 portfolio 재배열 (미매칭 tail 유지) */
export function orderPortfolioByCartItems(
  portfolio: readonly MediaItem[],
  cartItems: readonly Pick<PlanCartItem, "mediaId">[],
): MediaItem[] {
  return orderPortfolioByIdList(
    portfolio,
    cartItems.map((item) => item.mediaId),
  );
}

function hasExplicitPortfolioOrder(opts?: ReportPortfolioOrderOpts): boolean {
  return Boolean(opts?.manualOrder?.length || opts?.cartItems?.length);
}

/**
 * 보고서 portfolio 순서 SSOT.
 * 1. manualOrder → 2. cartItems → 3. 지역·유형·이름 그룹 정렬 (fallback)
 */
export function resolveReportPortfolioOrder(
  portfolio: readonly MediaItem[],
  opts?: ReportPortfolioOrderOpts,
): MediaItem[] {
  if (opts?.manualOrder?.length) {
    return orderPortfolioByIdList(portfolio, opts.manualOrder);
  }
  if (opts?.cartItems?.length) {
    return orderPortfolioByCartItems(portfolio, opts.cartItems);
  }
  return sortPlanCartReportPortfolio(portfolio);
}

/** 보고서·PDF 매체 구성 순서: 지역 → 디지털 → 고정형 → 이동형 → 기타 (fallback) */
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
  orderOpts?: ReportPortfolioOrderOpts,
): PlanCartReportMediaGroup[] {
  const preserveCartOrder = hasExplicitPortfolioOrder(orderOpts);
  const ordered = resolveReportPortfolioOrder(portfolio, orderOpts);
  const regionMap = new Map<string, MediaItem[]>();

  for (const item of ordered) {
    const key = planReportRegionKey(item);
    const list = regionMap.get(key) ?? [];
    list.push(item);
    regionMap.set(key, list);
  }

  const regionKeys = preserveCartOrder
    ? [...regionMap.keys()]
    : [...regionMap.keys()].sort(
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

    const categoryKeys = preserveCartOrder
      ? [...typeMap.keys()]
      : REPORT_CATEGORY_ORDER.filter((key) => (typeMap.get(key)?.length ?? 0) > 0);

    const categories = categoryKeys
      .filter((key) => (typeMap.get(key)?.length ?? 0) > 0)
      .map((categoryKey) => ({
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

/** payload-ooh / build-report 공용 — cart·manualOrder 있을 때만 orderOpts 반환 */
export function reportPortfolioOrderOpts(args: {
  planCartItems?: readonly PlanCartItem[];
  manualPortfolioOrder?: readonly string[];
}): ReportPortfolioOrderOpts | undefined {
  if (args.manualPortfolioOrder?.length) {
    return {
      manualOrder: args.manualPortfolioOrder,
      cartItems: args.planCartItems,
    };
  }
  if (args.planCartItems?.length) {
    return { cartItems: args.planCartItems };
  }
  return undefined;
}
