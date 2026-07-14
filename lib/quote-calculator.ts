import type { PrismaClient } from "@prisma/client";
import type { MediaItem, MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import {
  computeAdminQuoteTotals,
  inclusiveCampaignDays,
  lineSupplyWon,
  monthFactorFromDays,
} from "@/lib/admin-quote-calc";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { estimatedMonthlyImpressions } from "@/lib/ai-recommend-metrics";
import {
  getQuantityUnitMode,
  isMobileSingleMedia,
  resolveMediaQuantity,
  resolveMonthlyPriceForUnits,
} from "@/lib/media-quantity";
import {
  buildQuoteWizardLineContext,
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
  type PartialPeriodRatesMap,
} from "@/lib/media-partial-period-rates";

export const QUOTE_VALIDITY_DAYS = 14;

export type QuoteCalculatorMedia = {
  id: string;
  name: string;
  location: string;
  type?: string | null;
  price: number;
  pricePeriod?: MediaPricePeriodKey | string | null;
  priceOptions?: MediaPriceOption[] | null;
  partialPeriodRates?: PartialPeriodRatesMap | null;
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
  quantity?: number;
  quantityLabel?: string;
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

function toMediaItemForQuote(m: QuoteCalculatorMedia): MediaItem {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.name,
    location: m.location,
    locationEn: m.location,
    region: "",
    type: (m.type?.trim() || "digital") as MediaItem["type"],
    price: m.price,
    pricePeriod: m.pricePeriod,
    priceOptions: m.priceOptions ?? undefined,
    partialPeriodRates: m.partialPeriodRates ?? undefined,
    lat: m.latitude ?? 0,
    lng: m.longitude ?? 0,
    dailyFootTraffic: m.dailyFootfall ?? 0,
    impressions: m.impressions ?? undefined,
    sampleImages: [],
  };
}

function formatQuoteLineMediaName(
  name: string,
  option: MediaPriceOption | undefined,
): string {
  const label = option?.label?.trim();
  return label ? `${name} (${label})` : name;
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
    select: {
      id: true,
      name: true,
      location: true,
      type: true,
      price: true,
      pricePeriod: true,
      priceOptions: true,
      partialPeriodRates: true,
      dailyFootfall: true,
      impressions: true,
      latitude: true,
      longitude: true,
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
      price: m.price,
      pricePeriod: m.pricePeriod,
      priceOptions: parsePriceOptions(m.priceOptions),
      partialPeriodRates: parsePartialPeriodRatesRaw(m.partialPeriodRates),
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

  const lines: QuoteLineItem[] = input.media.map((m) => {
    const priceOptions = m.priceOptions ?? [];
    const mediaItem = toMediaItemForQuote(m);

    if (useOptionPricing && campaignPeriod != null) {
      const rawIdx = poMap[m.id] ?? 0;
      const poIdx =
        priceOptions.length > 0
          ? Math.min(Math.max(0, rawIdx), priceOptions.length - 1)
          : 0;
      const option = priceOptions[poIdx];
      const snap = selectionMap.get(m.id);
      const usePackagePeriod = snap?.usePackagePeriod === true;

      const wizardLine = buildQuoteWizardLineContext(mediaItem, {
        isKo: true,
        campaignPeriod,
        campaignPeriodLabel: campaignPeriod,
        priceOptionIndex: poIdx,
        usePackagePeriod,
      });

      const lineCampaignDays = usePackagePeriod
        ? (snap?.lineCampaignDays ?? wizardLine.campaignDays)
        : campaignDays;

      return {
        mediaId: m.id,
        mediaName: formatQuoteLineMediaName(m.name, option),
        location: m.location,
        periodDays: lineCampaignDays,
        unitPriceWon: Math.round(wizardLine.unitPriceMan * 10_000),
        lineSupplyWon: Math.round(wizardLine.lineTotalMan * 10_000),
        impressions: lineImpressions(m, lineCampaignDays),
        quantity: snap?.quantity,
        quantityLabel: snap?.quantityLabel ?? undefined,
        lat: m.latitude ?? undefined,
        lng: m.longitude ?? undefined,
      };
    }

    const snap = selectionMap.get(m.id);
    const mode = getQuantityUnitMode(mediaItem);
    const qty =
      snap?.quantity != null
        ? resolveMediaQuantity(mediaItem, snap.quantity)
        : 1;

    if (
      snap &&
      mode === "package" &&
      (m.priceOptions?.length ?? 0) > 0
    ) {
      const poIdx = snap?.priceOptionIndex ?? poMap[m.id] ?? 0;
      const opt = m.priceOptions?.[poIdx] ?? m.priceOptions?.[0];
      const unitPriceWon = opt
        ? catalogPriceFieldToWon(opt.price)
        : catalogPriceFieldToWon(m.price);
      const supply = Math.round(unitPriceWon * monthFactor);
      return {
        mediaId: m.id,
        mediaName: formatQuoteLineMediaName(m.name, opt),
        location: m.location,
        periodDays,
        unitPriceWon,
        lineSupplyWon: supply,
        impressions: lineImpressions(m, periodDays),
        quantity: 1,
        quantityLabel: snap?.quantityLabel ?? opt?.label ?? undefined,
        lat: m.latitude ?? undefined,
        lng: m.longitude ?? undefined,
      };
    }

    if (
      isMobileSingleMedia(mediaItem) &&
      snap?.quantity != null &&
      qty > 1
    ) {
      const monthlyWon = resolveMonthlyPriceForUnits(mediaItem, qty);
      const unitPriceWon = Math.round(monthlyWon / qty);
      const supply = Math.round(monthlyWon * monthFactor);
      return {
        mediaId: m.id,
        mediaName: m.name,
        location: m.location,
        periodDays,
        unitPriceWon,
        lineSupplyWon: supply,
        impressions: lineImpressions(m, periodDays),
        quantity: qty,
        quantityLabel: snap?.quantityLabel ?? `${qty}대`,
        lat: m.latitude ?? undefined,
        lng: m.longitude ?? undefined,
      };
    }

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
      ...(snap?.quantity != null ? { quantity: qty } : {}),
      ...(snap?.quantityLabel ? { quantityLabel: snap.quantityLabel } : {}),
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
