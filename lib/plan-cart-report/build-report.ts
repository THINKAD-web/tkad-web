import type { MediaItem } from "@/lib/media-data";
import type { PlanCart, PlanCartItem } from "@/lib/plan-cart";
import { mapPlanCartGoalToPlanner } from "@/lib/plan-cart-planner-bridge";
import {
  comparePlansByDuration,
  computePlannerMetrics,
  computePlannerPortfolioMonthlyMan,
  normalizeMediaTypeForPlanner,
  plannerReportCategoryKey,
  resolvePlannerMediaKind,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import type { PlannerPortfolioPricing } from "@/lib/planner/planner-media-quantity";
import {
  isPlannerIndustryKey,
  PLANNER_BUDGET_MIN,
  plannerIndustryLabel,
  type PlannerIndustryKey,
} from "@/lib/planner/types";
import type { PlannerReportSharedProps } from "@/components/planner-report-step";
import {
  computePlanCartRegionalBreakdown,
  planReportRegionKey,
  planReportRegionLabel,
  planReportRegionSortOrder,
  resolvePlanCartItemRegionKey,
} from "@/lib/plan-cart-report/regional-breakdown";
import { planCartPortfolioPricing } from "@/lib/plan-cart-pricing";
import {
  flattenPlanCartReportGroups,
  groupPlanCartReportPortfolio,
} from "@/lib/plan-cart-report/sort-portfolio";
import type {
  PlannerExportChartDatum,
  PlannerExportRegionBreakdown,
} from "@/lib/planner-report-export/types";

const GOAL_TITLES_KO: Record<PlannerCampaignGoal, string> = {
  brand: "브랜드 인지도",
  launch: "신제품 론칭",
  event: "이벤트·프로모션",
  sales: "전환·판매",
  local: "지역 마케팅",
};

const GOAL_TITLES_EN: Record<PlannerCampaignGoal, string> = {
  brand: "Brand awareness",
  launch: "Product launch",
  event: "Event promotion",
  sales: "Conversion",
  local: "Local marketing",
};

function resolveOverlayMediaType(
  cartType: string,
  catalog: MediaItem,
): string {
  const kind = resolvePlannerMediaKind({
    type: catalog.type,
    subCategory: catalog.subCategory,
    mediaSubCategory: catalog.mediaSubCategory,
    mediaMainCategory: catalog.mediaMainCategory,
    name: catalog.name,
    nameEn: catalog.nameEn,
    tags: catalog.tags,
  });
  if (kind) return kind;
  for (const raw of [cartType.trim(), catalog.type.trim()].filter(Boolean)) {
    const norm = normalizeMediaTypeForPlanner(raw);
    if (norm) return norm;
  }
  return catalog.type.trim() || cartType.trim() || "digital";
}

function stubMediaFromCartItem(item: PlanCartItem): MediaItem {
  const stub: MediaItem = {
    id: item.mediaId,
    name: item.mediaName,
    nameEn: item.mediaName,
    location: item.region || "",
    locationEn: item.region || "",
    region: "other",
    type: item.mediaType || "digital",
    price: item.price,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: item.thumbnailUrl ? [item.thumbnailUrl] : [],
  };
  const regionKey = resolvePlanCartItemRegionKey(item.region ?? "", stub);
  return { ...stub, region: regionKey, regionMain: regionKey };
}

export function resolvePlanCartPortfolio(
  cart: PlanCart,
  catalog: readonly MediaItem[],
): MediaItem[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  return cart.items
    .map((item) => {
      const fromCatalog = byId.get(item.mediaId);
      const cartType = item.mediaType?.trim() || "";
      if (fromCatalog) {
        const regionKey = resolvePlanCartItemRegionKey(
          item.region ?? "",
          fromCatalog,
        );
        return {
          ...fromCatalog,
          region: regionKey,
          regionMain: regionKey,
          type: resolveOverlayMediaType(cartType, fromCatalog),
        };
      }
      return stubMediaFromCartItem(item);
    })
    .filter(Boolean);
}

function resolvePlanCartBudgetMan(
  cart: PlanCart,
  portfolio: readonly MediaItem[],
  pricing?: PlannerPortfolioPricing,
): number {
  if (cart.totalBudget != null && cart.totalBudget > 0) {
    return Math.max(1, Math.round(cart.totalBudget / 10_000));
  }
  const sum = computePlannerPortfolioMonthlyMan(portfolio, pricing);
  return sum > 0 ? sum : PLANNER_BUDGET_MIN;
}

function inferCategoriesText(portfolio: readonly MediaItem[], isKo: boolean): string {
  const keys = new Set<string>();
  for (const m of portfolio) {
    const key = plannerReportCategoryKey(m);
    if (key === "digital") keys.add(isKo ? "디지털" : "Digital");
    else if (key === "static") keys.add(isKo ? "고정형" : "Static");
    else if (key === "mobile") keys.add(isKo ? "이동형" : "Mobile");
  }
  return [...keys].join(", ") || (isKo ? "혼합" : "Mixed");
}

function inferRegionsText(portfolio: readonly MediaItem[], isKo: boolean): string {
  const keys = new Set(portfolio.map((m) => planReportRegionKey(m)));
  return [...keys]
    .sort((a, b) => planReportRegionSortOrder(a) - planReportRegionSortOrder(b))
    .map((key) => planReportRegionLabel(key, isKo))
    .join(", ");
}

export type PlanCartReportBundle = {
  reportProps: PlannerReportSharedProps;
  regionalBreakdown: PlannerExportRegionBreakdown[];
  regionBudgetCharts: PlannerExportChartDatum[];
  regionImpressionCharts: PlannerExportChartDatum[];
  portfolioGroups: ReturnType<typeof groupPlanCartReportPortfolio>;
};

export function buildPlanCartReportBundle(args: {
  cart: PlanCart;
  catalog: readonly MediaItem[];
  isKo: boolean;
}): PlanCartReportBundle | null {
  const { cart, catalog, isKo } = args;
  const portfolio = resolvePlanCartPortfolio(cart, catalog);
  if (portfolio.length === 0) return null;

  const portfolioGroups = groupPlanCartReportPortfolio(portfolio, isKo);
  const portfolioSorted = flattenPlanCartReportGroups(portfolioGroups);
  const pricing = planCartPortfolioPricing(cart);

  // A-1 Wave 2 — `Math.max(1, ...)` 클램프 제거.
  // planner-page-client 가 `duration: months` 로 저장하므로 21일 플랜은 0.7 이 들어온다.
  // 1 로 올림하면 「내 플랜」 보고서가 지역 표와 같은 금액 왜곡을 일으킨다.
  const months =
    cart.duration != null && cart.duration > 0 ? cart.duration : 1;
  const budgetMan = resolvePlanCartBudgetMan(cart, portfolioSorted, pricing);
  const campaignGoal = mapPlanCartGoalToPlanner(cart.campaignGoal) ?? "brand";
  const goalTitle = isKo
    ? GOAL_TITLES_KO[campaignGoal]
    : GOAL_TITLES_EN[campaignGoal];

  const metrics: PlannerMetrics | null = computePlannerMetrics(
    portfolioSorted,
    budgetMan,
    months,
    { campaignGoal, pricing },
  );
  const regionalBreakdown = computePlanCartRegionalBreakdown(
    portfolioSorted,
    months,
    isKo,
    pricing,
  );

  const regionBudgetCharts: PlannerExportChartDatum[] = regionalBreakdown
    .filter((r) => r.monthlyBudgetWon > 0)
    .map((r) => ({
      label: r.label,
      value: r.monthlyBudgetWon,
      colorKey: r.regionKey,
      pct: r.budgetPct,
    }));

  const regionImpressionCharts: PlannerExportChartDatum[] = regionalBreakdown
    .filter((r) => r.monthlyImpressions > 0)
    .map((r) => ({
      label: r.label,
      value: r.monthlyImpressions,
      colorKey: r.regionKey,
      pct: r.impressionPct,
    }));

  const monthlyTotalMan = computePlannerPortfolioMonthlyMan(
    portfolioSorted,
    pricing,
  );

  const industryKey: PlannerIndustryKey | null = isPlannerIndustryKey(
    cart.industryKey,
  )
    ? cart.industryKey
    : null;
  const industryText = plannerIndustryLabel(industryKey, isKo);

  return {
    regionalBreakdown,
    regionBudgetCharts,
    regionImpressionCharts,
    portfolioGroups,
    reportProps: {
      isKo,
      campaignGoal,
      goalTitle,
      budgetNum: budgetMan,
      months,
      regionsText: inferRegionsText(portfolioSorted, isKo),
      categoriesText: inferCategoriesText(portfolioSorted, isKo),
      ageText: isKo ? "전 연령" : "All ages",
      industryText,
      industryKey,
      portfolio: portfolioSorted,
      matchedCount: portfolio.length,
      monthCompare: comparePlansByDuration(portfolioSorted, budgetMan, [1, 3, 6]),
      metrics,
      reachCorePct: 0,
      reachExtendedPct: 0,
      selectedMediaCount: cart.items.length,
      portfolioOverBudget: monthlyTotalMan > budgetMan + 0.01,
      portfolioMonthlyTotalMan: monthlyTotalMan,
      portfolioMonthlyBudgetMan: budgetMan,
      isAutoPortfolio: false,
      planCartItems: cart.items,
      unresolvedMediaCount: Math.max(
        0,
        cart.items.length -
          portfolio.filter((m) => catalog.some((c) => c.id === m.id)).length,
      ),
    },
  };
}
