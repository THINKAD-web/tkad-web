import type { PrismaClient } from "@prisma/client";
import type { MediaPricePeriodKey } from "@/lib/media-data";
import {
  computeAdminQuoteTotals,
  inclusiveCampaignDays,
  lineSupplyWon,
  monthFactorFromDays,
} from "@/lib/admin-quote-calc";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { estimatedMonthlyImpressions } from "@/lib/ai-recommend-metrics";

export const QUOTE_VALIDITY_DAYS = 14;

export type QuoteCalculatorMedia = {
  id: string;
  name: string;
  location: string;
  price: number;
  pricePeriod?: MediaPricePeriodKey | string | null;
  dailyFootfall?: number | null;
  impressions?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type QuoteLineItem = {
  mediaId: string;
  mediaName: string;
  location: string;
  periodDays: number;
  unitPriceWon: number;
  lineSupplyWon: number;
  impressions: number;
  lat?: number;
  lng?: number;
};

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
  media: QuoteCalculatorMedia[];
  startDate: Date;
  endDate: Date;
  discountRate?: number;
  issuedAt?: Date;
};

/** DB 조회 기반 API — `calculateQuote({ mediaIds, startDate, endDate, discountRate })` */
export type CalculateQuoteByMediaIdsInput = {
  mediaIds: string[];
  startDate: Date | string;
  endDate: Date | string;
  discountRate?: number;
  issuedAt?: Date;
};

function coerceDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export type CalculateQuoteResult = QuoteBreakdown & {
  /** OoHQuote.totalAmount (만원 단위) */
  totalAmountManwon: number;
  startDate: Date;
  endDate: Date;
  validUntilDate: Date;
  periodDays: number;
};

function lineImpressions(
  m: QuoteCalculatorMedia,
  campaignDays: number,
): number {
  const monthly =
    m.impressions ??
    (m.dailyFootfall != null && m.dailyFootfall > 0
      ? m.dailyFootfall * 30
      : estimatedMonthlyImpressions({
          id: m.id,
          name: m.name,
          nameEn: m.name,
          location: m.location,
          locationEn: m.location,
          region: "",
          type: "digital",
          price: m.price,
          lat: m.latitude ?? 0,
          lng: m.longitude ?? 0,
          dailyFootTraffic: m.dailyFootfall ?? 0,
          sampleImages: [],
        }));
  return Math.round(monthly * (campaignDays / 30));
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
    where: { id: { in: ids.slice(0, 24) }, isActive: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  const media = rows
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((m) => ({
      id: m.id,
      name: m.name,
      location: m.location,
      price: m.price,
      pricePeriod: m.pricePeriod,
      dailyFootfall: m.dailyFootfall,
      impressions: m.impressions,
      latitude: m.latitude,
      longitude: m.longitude,
    }));
  if (media.length === 0) throw new Error("NO_MEDIA_FOUND");
  return calculateQuote({
    media,
    startDate: coerceDate(input.startDate),
    endDate: coerceDate(input.endDate),
    discountRate: input.discountRate,
    issuedAt: input.issuedAt,
  });
}

export function calculateQuote(input: CalculateQuoteInput): CalculateQuoteResult {
  const issuedAt = input.issuedAt ?? new Date();
  const start = input.startDate;
  const end = input.endDate;
  const periodDays = Math.max(1, inclusiveCampaignDays(start, end));
  const monthFactor = monthFactorFromDays(periodDays);
  const discountRate = Math.min(100, Math.max(0, input.discountRate ?? 0));

  const lines: QuoteLineItem[] = input.media.map((m) => {
    const unitPriceWon = catalogPriceFieldToWon(m.price);
    const supply = lineSupplyWon(m.price, monthFactor, 1);
    return {
      mediaId: m.id,
      mediaName: m.name,
      location: m.location,
      periodDays,
      unitPriceWon,
      lineSupplyWon: supply,
      impressions: lineImpressions(m, periodDays),
      lat: m.latitude ?? undefined,
      lng: m.longitude ?? undefined,
    };
  });

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
