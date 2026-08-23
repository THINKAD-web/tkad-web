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
import { plannerReportCategoryLabels } from "@/lib/planner-logic";
import { plannerMediaPeriodLineWon } from "@/lib/planner/planner-media-quantity";
import type { PlannerPortfolioPricing } from "@/lib/planner/planner-media-quantity";
import type { PlannerPeriodPricingContext } from "@/lib/planner/planner-media-quantity";

function cpmWonFromParts(net: number, impressions: number): number | null {
  if (impressions < MIN_IMPRESSIONS_FOR_CPM || net <= 0) return null;
  const raw = Math.round((net / impressions) * 1000);
  return raw > 0 ? raw : null;
}

function quoteOnlyIdSet(portfolio: readonly MediaItem[]): Set<string> {
  return new Set(
    portfolio.filter((m) => isQuoteOnlyMedia(m)).map((m) => m.id),
  );
}

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

/** calculatePlan 결과 — 협의가 제외 확정 노출 (CPM 분모) */
export function confirmedImpressionsExcludingQuoteOnly(
  plan: PlanResult,
  portfolio: readonly MediaItem[],
): number {
  const quoteIds = quoteOnlyIdSet(portfolio);
  if (quoteIds.size === 0) return plan.impressions.campaignTotal;
  let imp = 0;
  for (const row of plan.mediaItems) {
    if (quoteIds.has(row.id)) continue;
    imp += row.campaignImpressions;
  }
  return imp;
}

/** CPM KPI·차트 근처 각주 — 분모 노출을 숫자로 명시 */
export function buildCpmExclusionFootnote(args: {
  plan: PlanResult;
  portfolio: readonly MediaItem[];
  isKo: boolean;
}): string | undefined {
  const quoteIds = quoteOnlyIdSet(args.portfolio);
  if (quoteIds.size === 0) return undefined;
  const imp = confirmedImpressionsExcludingQuoteOnly(args.plan, args.portfolio);
  const fmt = (n: number) =>
    n.toLocaleString(args.isKo ? "ko-KR" : "en-US");
  return args.isKo
    ? `CPM 산정 노출 ${fmt(imp)}회 (문의 매체 제외)`
    : `CPM basis: ${fmt(imp)} impressions (inquiry media excluded)`;
}

/** 유형별 CPM 막대 — 협의가 매체는 분자·분모 모두 제외 */
export function categoryCpmBarsExcludingQuoteOnly(
  plan: PlanResult,
  portfolio: readonly MediaItem[],
  isKo: boolean,
): { key: string; label: string; value: number }[] {
  const quoteIds = quoteOnlyIdSet(portfolio);
  if (quoteIds.size === 0) {
    return plan.breakdown.byCategory
      .filter((s) => (s.cpmWon ?? 0) > 0)
      .map((s) => ({
        key: s.key,
        label: isKo ? s.labelKo : s.labelEn,
        value: s.cpmWon ?? 0,
      }))
      .sort((a, b) => a.value - b.value);
  }

  const groups = new Map<
    string,
    { budget: number; impressions: number; labelKo: string; labelEn: string }
  >();
  for (const row of plan.mediaItems) {
    if (quoteIds.has(row.id)) continue;
    const key = row.categoryKey;
    const labels = plannerReportCategoryLabels(key);
    const g =
      groups.get(key) ?? {
        budget: 0,
        impressions: 0,
        labelKo: labels.labelKo,
        labelEn: labels.labelEn,
      };
    g.budget += row.itemNet;
    g.impressions += row.campaignImpressions;
    groups.set(key, g);
  }

  return [...groups.entries()]
    .map(([key, g]) => {
      const cpm = cpmWonFromParts(g.budget, g.impressions);
      return {
        key,
        label: isKo ? g.labelKo : g.labelEn,
        value: cpm ?? 0,
      };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => a.value - b.value);
}

/** calculatePlan 결과 — 협의가 제외 블렌디드 CPM (노출·도달은 전체 유지) */
export function blendedCpmExcludingQuoteOnly(
  plan: PlanResult,
  portfolio: readonly MediaItem[],
): number | null {
  const quoteIds = quoteOnlyIdSet(portfolio);
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
  return cpmWonFromParts(net, imp);
}

/** 예산 비중 % — 협의가는 null(표시 —) */
export function budgetSharePctForMedia(args: {
  media: MediaItem;
  budgetPct: number;
}): number | null {
  if (isQuoteOnlyMedia(args.media)) return null;
  return args.budgetPct;
}
