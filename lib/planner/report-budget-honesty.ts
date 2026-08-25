/**
 * 보고서 1p 「요청 예산 / 확정」— 브리프·AI·위저드 공통.
 */

import type { MediaItem } from "@/lib/media-data";
import type { PlanResult } from "@/lib/planner/calc/types";
import {
  buildExportBudgetHonesty,
  type PlannerExportBudgetHonesty,
} from "@/lib/planner/brief/over-budget-copy";
import { resolveStoredOverBudget } from "@/lib/campaign-plan-schema";
import {
  buildQuoteOnlyNotice,
  sumConfirmedMixWon,
} from "@/lib/planner/quote-only-portfolio";
import { portfolioQuoteOnlyMedia } from "@/lib/media-pricing-mode";
import type {
  PlannerPeriodPricingContext,
  PlannerPortfolioPricing,
} from "@/lib/planner/planner-media-quantity";

export function buildReportBudgetHonesty(args: {
  requestWon: number;
  portfolio: readonly MediaItem[];
  pricing?: PlannerPortfolioPricing;
  periodCtx?: PlannerPeriodPricingContext;
  isKo: boolean;
  /** budgetAllocation 합 등 — 없으면 portfolio에서 확정분 재계산 */
  confirmedMixWon?: number;
  planMetrics?: Pick<PlanResult["metrics"], "totalCostWon">;
}): PlannerExportBudgetHonesty | undefined {
  const quoteOnly = portfolioQuoteOnlyMedia(args.portfolio);
  const quoteNotice = buildQuoteOnlyNotice({
    portfolio: args.portfolio,
    isKo: args.isKo,
  });

  const confirmedMixWon =
    args.confirmedMixWon ??
    sumConfirmedMixWon({
      portfolio: args.portfolio,
      pricing: args.pricing,
      periodCtx: args.periodCtx,
      isKo: args.isKo,
    });

  const mixWon =
    confirmedMixWon > 0
      ? confirmedMixWon
      : (args.planMetrics?.totalCostWon ?? 0);

  /** 표시 금액(확정분·budgetAllocation) 기준 — 저장 metrics.overBudgetWon 과 다를 수 있음 */
  const { overBudgetWon, budgetUsedRate } = resolveStoredOverBudget(
    { totalCostWon: mixWon },
    args.requestWon,
  );

  return buildExportBudgetHonesty({
    requestWon: args.requestWon,
    mixWon,
    overBudgetWon,
    budgetUsedRate,
    isKo: args.isKo,
    quoteOnlyCount: quoteOnly.length > 0 ? quoteOnly.length : undefined,
    quoteOnlyFootnote: quoteNotice?.text,
  });
}
