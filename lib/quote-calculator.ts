import type { PrismaClient } from "@prisma/client";
import type { MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import {
  computeAdminQuoteTotals,
  inclusiveCampaignDays,
  monthFactorFromDays,
} from "@/lib/admin-quote-calc";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import {
  isQuoteCampaignPeriodKey,
  quoteCampaignDaysFromPeriodKey,
  type QuoteCampaignPeriodKey,
} from "@/lib/quote-wizard-pricing";
import {
  selectionsByMediaId,
  type QuoteMediaSelectionSnapshot,
} from "@/lib/quote-media-selections";
import {
  parsePartialPeriodRatesFromPriceOptionRow,
  parsePartialPeriodRatesRaw,
} from "@/lib/media-partial-period-rates";
import { resolvePricingStrategy } from "@/lib/pricing/resolve-pricing-strategy";
import type {
  OnlineSpecForPricing,
  QuoteCalculatorMedia as QuoteCalculatorMediaType,
  QuoteLineItem,
} from "@/lib/pricing/strategy-types";
import {
  assertQuoteCalculatorDisplayType,
  QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE,
} from "@/lib/pricing/fixed-period-pricing";
import { BUDGET_PRICING_NOT_IMPLEMENTED } from "@/lib/pricing/budget-pricing";

export { QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE, assertQuoteCalculatorDisplayType };
export { BUDGET_PRICING_NOT_IMPLEMENTED };
export type { QuoteCalculatorMediaType as QuoteCalculatorMedia, QuoteLineItem };

export const QUOTE_VALIDITY_DAYS = 14;

export type QuoteBreakdown = {
  lines: QuoteLineItem[];
  subtotalWon: number;
  discountRate: number;
  discountWon: number;
  supplyWon: number;
  vatWon: number;
  totalWon: number;
  validUntil: string;
  issuedAt: string;
};

export type CalculateQuoteInput = {
  media: QuoteCalculatorMediaType[];
  startDate: Date;
  endDate: Date;
  discountRate?: number;
  issuedAt?: Date;
  /** 견적 마법사 — 있으면 선택 옵션·캠페인 기간 기준 (UI와 동일) */
  periodKey?: string;
  mediaPriceOptionIndex?: Record<string, number>;
  mediaSelections?: QuoteMediaSelectionSnapshot[];
};

/** DB 조회 기반 API — `calculateQuote({ mediaIds, startDate, endDate, discountRate })` */
export type CalculateQuoteByMediaIdsInput = {
  mediaIds: string[];
  startDate: Date | string;
  endDate: Date | string;
  discountRate?: number;
  issuedAt?: Date;
  periodKey?: string;
  mediaPriceOptionIndex?: Record<string, number>;
  mediaSelections?: QuoteMediaSelectionSnapshot[];
};

function parsePriceOptions(raw: unknown): MediaPriceOption[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaPriceOption[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof (o as MediaPriceOption).price !== "number") continue;
    const item = row as MediaPriceOption;
    const optionPartialRates = parsePartialPeriodRatesFromPriceOptionRow(o);
    out.push(
      optionPartialRates
        ? { ...item, partialPeriodRates: optionPartialRates }
        : item,
    );
  }
  return out;
}

function campaignDaysFromPeriodKey(key: QuoteCampaignPeriodKey): number {
  return quoteCampaignDaysFromPeriodKey(key);
}

function coerceDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export type CalculateQuoteResult = QuoteBreakdown & {
  /** OoHQuote.totalAmount (만원 단위) — 고객 UI는 {@link formatOohQuoteTotalKrw} 로 원 표시 */
  totalAmountManwon: number;
  startDate: Date;
  endDate: Date;
  validUntilDate: Date;
  periodDays: number;
};

const onlineSpecSelect = {
  platform: true,
  minBudget: true,
  cpcMin: true,
  cpcMax: true,
  cpmMin: true,
  cpmMax: true,
} as const;

function mapOnlineSpec(
  row: {
    onlineSpec: {
      platform: string;
      minBudget: number;
      cpcMin: number | null;
      cpcMax: number | null;
      cpmMin: number | null;
      cpmMax: number | null;
    } | null;
  } | null,
): OnlineSpecForPricing | null {
  if (!row?.onlineSpec) return null;
  return row.onlineSpec;
}

export async function calculateQuoteFromMediaIds(
  db: Pick<PrismaClient, "media">,
  input: CalculateQuoteByMediaIdsInput,
): Promise<CalculateQuoteResult> {
  const ids = [...new Set(input.mediaIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new Error("NO_MEDIA_IDS");
  }
  const rows = await db.media.findMany({
    where: publicActiveMediaWhere({ id: { in: ids.slice(0, 24) } }),
    select: {
      id: true,
      name: true,
      location: true,
      type: true,
      catalogChannel: true,
      price: true,
      pricePeriod: true,
      priceOptions: true,
      partialPeriodRates: true,
      dailyFootfall: true,
      impressions: true,
      latitude: true,
      longitude: true,
      onlineSpec: { select: onlineSpecSelect },
    },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  const media = rows
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((m) => ({
      id: m.id,
      name: m.name,
      location: m.location,
      type: m.type,
      catalogChannel: m.catalogChannel,
      price: m.price,
      pricePeriod: m.pricePeriod,
      priceOptions: parsePriceOptions(m.priceOptions),
      partialPeriodRates: parsePartialPeriodRatesRaw(m.partialPeriodRates),
      dailyFootfall: m.dailyFootfall,
      impressions: m.impressions,
      latitude: m.latitude,
      longitude: m.longitude,
      onlineSpec: mapOnlineSpec(m),
    }));
  if (media.length === 0) throw new Error("NO_MEDIA_FOUND");
  return calculateQuote({
    media,
    startDate: coerceDate(input.startDate),
    endDate: coerceDate(input.endDate),
    discountRate: input.discountRate,
    issuedAt: input.issuedAt,
    periodKey: input.periodKey,
    mediaPriceOptionIndex: input.mediaPriceOptionIndex,
    mediaSelections: input.mediaSelections,
  });
}

export function calculateQuote(input: CalculateQuoteInput): CalculateQuoteResult {
  const issuedAt = input.issuedAt ?? new Date();
  const start = input.startDate;
  const end = input.endDate;
  const periodDays = Math.max(1, inclusiveCampaignDays(start, end));
  const monthFactor = monthFactorFromDays(periodDays);
  const discountRate = Math.min(100, Math.max(0, input.discountRate ?? 0));

  const useOptionPricing =
    input.mediaPriceOptionIndex !== undefined &&
    input.periodKey != null &&
    isQuoteCampaignPeriodKey(input.periodKey);
  const campaignPeriod = useOptionPricing ? input.periodKey : null;
  const poMap = input.mediaPriceOptionIndex ?? {};
  const selectionMap = selectionsByMediaId(input.mediaSelections);
  const campaignDays =
    campaignPeriod != null
      ? campaignDaysFromPeriodKey(campaignPeriod)
      : periodDays;

  const strategyCtx = {
    startDate: start,
    endDate: end,
    periodDays,
    monthFactor,
    discountRate,
    periodKey: input.periodKey,
    mediaPriceOptionIndex: input.mediaPriceOptionIndex,
    mediaSelections: input.mediaSelections,
    useOptionPricing,
    campaignPeriod,
    campaignDays,
    selectionMap,
    poMap,
  };

  const lines: QuoteLineItem[] = input.media.map((m) =>
    resolvePricingStrategy(m.catalogChannel).calculateLine({
      media: m,
      ctx: strategyCtx,
    }),
  );

  const lineWons = lines.map((l) => l.lineSupplyWon);
  const totals = computeAdminQuoteTotals({
    lineWons,
    discountPercent: discountRate,
    discountWon: 0,
    vatIncluded: false,
  });

  const validUntil = new Date(issuedAt.getTime());
  validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

  const breakdown: QuoteBreakdown = {
    lines,
    subtotalWon: totals.linesSubtotalWon,
    discountRate,
    discountWon: totals.discountTotalWon,
    supplyWon: totals.supplyWon,
    vatWon: totals.vatWon,
    totalWon: totals.totalWon,
    validUntil: validUntil.toISOString(),
    issuedAt: issuedAt.toISOString(),
  };

  return {
    lines: breakdown.lines,
    subtotalWon: breakdown.subtotalWon,
    discountRate: breakdown.discountRate,
    discountWon: breakdown.discountWon,
    supplyWon: breakdown.supplyWon,
    vatWon: breakdown.vatWon,
    totalWon: breakdown.totalWon,
    validUntil: breakdown.validUntil,
    issuedAt: breakdown.issuedAt,
    totalAmountManwon: Math.max(1, Math.round(totals.totalWon / 10_000)),
    startDate: start,
    endDate: end,
    validUntilDate: validUntil,
    periodDays,
  };
}

export function periodLabelForDays(days: number, locale: string): string {
  const isKo = locale !== "en";
  if (days <= 7) return isKo ? `${days}일` : `${days} days`;
  if (days <= 31) return isKo ? `약 ${days}일` : `~${days} days`;
  const months = Math.round(days / 30);
  return isKo ? `${months}개월` : `${months} month(s)`;
}

export function budgetRangeManwonFromCode(
  code: string | undefined,
): { min: number | null; max: number | null } {
  switch (code) {
    case "under_5m":
    case "under_10m":
      return { min: null, max: 500 };
    case "5m_10m":
      return { min: 500, max: 1000 };
    case "10m_30m":
    case "10m_50m":
      return { min: 1000, max: 3000 };
    case "50m_100m":
      return { min: 3000, max: 10000 };
    case "over_30m":
    case "over_100m":
      return { min: 3000, max: null };
    default:
      return { min: null, max: null };
  }
}
