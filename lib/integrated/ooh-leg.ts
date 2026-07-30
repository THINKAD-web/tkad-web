import type { MediaItem } from "@/lib/media-data";
import {
  computeAdvancedPlannerMetrics,
  computePlannerMetrics,
  filterPlannerMediaMulti,
  orderPlannerSelectedMedia,
  resolvePlannerPortfolio,
} from "@/lib/planner-logic";
import { plannerMonthlyPriceManForMedia } from "@/lib/planner/planner-media-quantity";
import { recommendPlannerMedia } from "@/lib/planner/recommend";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import { rationaleLinesForLocale } from "@/lib/recommend/recommend-rationale";

export type OohLegResult = {
  portfolio: MediaItem[];
  recommended: Array<{
    mediaId: string;
    name: string;
    region: string;
    budgetWon: number;
    budgetPct: number;
    score: number;
    rationaleKo: string;
    rationaleEn: string;
  }>;
  metrics: {
    impressions: number;
    reach: number;
    cpmKrw: number | null;
  };
};

const MIN_OOH_RECOMMENDATIONS = 1;

export function buildOohLeg(opts: {
  catalog: readonly MediaItem[];
  recommendCtx: RecommendationContext;
  oohBudgetWon: number;
  selectedOohMediaIds?: string[];
  locale: "ko" | "en";
}): OohLegResult | null {
  const { catalog, recommendCtx, oohBudgetWon, selectedOohMediaIds, locale } =
    opts;
  const oohBudgetMan = oohBudgetWon / 10_000;
  if (oohBudgetMan <= 0) {
    return {
      portfolio: [],
      recommended: [],
      metrics: { impressions: 0, reach: 0, cpmKrw: null },
    };
  }

  const filtered = filterPlannerMediaMulti(
    [...catalog],
    new Set(recommendCtx.regions),
    new Set(recommendCtx.categories),
  );

  const selectedOrdered =
    selectedOohMediaIds && selectedOohMediaIds.length > 0
      ? orderPlannerSelectedMedia([...catalog], selectedOohMediaIds)
      : [];

  const portfolio = resolvePlannerPortfolio({
    campaignMediaIds: selectedOohMediaIds ?? [],
    selectedMediaOrdered: selectedOrdered,
    filtered,
    budgetMan: oohBudgetMan,
    months: recommendCtx.months,
    mediaSelectionExplicit: Boolean(selectedOohMediaIds?.length),
    recommendCtx,
  });

  if (portfolio.length < MIN_OOH_RECOMMENDATIONS && !selectedOohMediaIds?.length) {
    return null;
  }

  const scored = recommendPlannerMedia(
    catalog,
    recommendCtx,
    20,
    0,
    locale,
  );
  const scoredById = new Map(scored.map((s) => [s.media.id, s]));

  const weightSum = portfolio.reduce(
    (sum, m) => sum + Math.max(1, plannerMonthlyPriceManForMedia(m)),
    0,
  );

  const recommended = portfolio.map((m) => {
    const weight = Math.max(1, plannerMonthlyPriceManForMedia(m));
    const budgetWon = Math.round((oohBudgetWon * weight) / weightSum);
    const budgetPct =
      oohBudgetWon > 0 ? Math.round((budgetWon / oohBudgetWon) * 1000) / 10 : 0;
    const hit = scoredById.get(m.id);
    const rationaleKo = hit
      ? rationaleLinesForLocale(hit.rationaleLines, "ko").join(" ")
      : "";
    const rationaleEn = hit
      ? rationaleLinesForLocale(hit.rationaleLines, "en").join(" ")
      : "";
    return {
      mediaId: m.id,
      name: locale === "ko" ? m.name : m.nameEn || m.name,
      region: m.region ?? m.location ?? "",
      budgetWon,
      budgetPct,
      score: hit?.score ?? 0,
      rationaleKo,
      rationaleEn,
    };
  });

  const plannerMetrics = computePlannerMetrics(
    portfolio,
    oohBudgetMan,
    recommendCtx.months,
    { campaignGoal: recommendCtx.goal },
  );
  const advanced = computeAdvancedPlannerMetrics({
    portfolio,
    budgetMan: oohBudgetMan,
    months: recommendCtx.months,
  });

  return {
    portfolio,
    recommended,
    metrics: {
      impressions: plannerMetrics?.estimatedTotalImpressions ?? 0,
      reach: advanced?.uniqueReach ?? plannerMetrics?.estimatedTotalImpressions ?? 0,
      cpmKrw: advanced?.cpmKrw ?? null,
    },
  };
}

export function isOohCatalogInsufficient(result: OohLegResult | null): boolean {
  if (!result) return true;
  return result.recommended.length < MIN_OOH_RECOMMENDATIONS;
}
