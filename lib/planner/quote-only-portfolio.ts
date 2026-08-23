/**
 * 협의가(quote_only) 매체 — 보고서·믹스 합계·CPM·각주.
 */

import type { MediaItem } from "@/lib/media-data";
import type { PlanResult } from "@/lib/planner/calc/types";
import { MIN_IMPRESSIONS_FOR_CPM } from "@/lib/metrics/constants";
import {
  isQuoteOnlyMedia,
  portfolioQuoteOnlyMedia,
  quoteOnlyGroupLabel,
} from "@/lib/media-pricing-mode";
import { plannerMediaPeriodLineWon } from "@/lib/planner/planner-media-quantity";
import type { PlannerPortfolioPricing } from "@/lib/planner/planner-media-quantity";
import type { PlannerPeriodPricingContext } from "@/lib/planner/planner-media-quantity";

export type QuoteOnlyNotice = {
  text: string;
  affectedMediaIds: string[];
  count: number;
  groupLabel: string;
};

export function buildQuoteOnlyNotice(args: {
  portfolio: readonly MediaItem[];
  isKo: boolean;
}): QuoteOnlyNotice | undefined {
  const affected = portfolioQuoteOnlyMedia(args.portfolio);
  if (affected.length === 0) return undefined;

  const groupLabel = quoteOnlyGroupLabel(affected, args.isKo);
  const text = args.isKo
    ? `※ ${groupLabel} ${affected.length}건 별도 문의 — 위 금액에 포함되지 않습니다`
    : `※ ${affected.length} ${groupLabel} item(s) priced on inquiry — not included above`;

  return {
    text,
    affectedMediaIds: affected.map((m) => m.id),
    count: affected.length,
    groupLabel,
  };
}

/** 확정(고정 단가) 매체만 합산 — 기간·수량 반영 */
export function sumConfirmedMixWon(args: {
  portfolio: readonly MediaItem[];
  pricing?: PlannerPortfolioPricing;
  periodCtx?: PlannerPeriodPricingContext;
  isKo?: boolean;
}): number {
  const { portfolio, pricing, periodCtx, isKo = true } = args;
  let sum = 0;
  for (const m of portfolio) {
    if (isQuoteOnlyMedia(m)) continue;
    const won = periodCtx
      ? plannerMediaPeriodLineWon(m, periodCtx, pricing, isKo)
      : 0;
    if (won > 0) sum += won;
  }
  return sum;
}

/** calculatePlan 결과 — 협의가 제외 블렌디드 CPM (노출·도달은 전체 유지) */
export function blendedCpmExcludingQuoteOnly(
  plan: PlanResult,
  portfolio: readonly MediaItem[],
): number | null {
  const quoteIds = new Set(
    portfolio.filter((m) => isQuoteOnlyMedia(m)).map((m) => m.id),
  );
  if (quoteIds.size === 0) {
    return plan.cpm.campaignWon;
  }
  let net = 0;
  let imp = 0;
  for (const row of plan.mediaItems) {
    if (quoteIds.has(row.id)) continue;
    net += row.itemNet;
    imp += row.campaignImpressions;
  }
  if (imp < MIN_IMPRESSIONS_FOR_CPM || net <= 0) return null;
  const raw = Math.round((net / imp) * 1000);
  return raw > 0 ? raw : null;
}

/** 예산 비중 % — 협의가는 null(표시 —) */
export function budgetSharePctForMedia(args: {
  media: MediaItem;
  budgetPct: number;
}): number | null {
  if (isQuoteOnlyMedia(args.media)) return null;
  return args.budgetPct;
}
