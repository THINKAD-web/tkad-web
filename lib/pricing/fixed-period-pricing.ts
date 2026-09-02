import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { resolveMonthlyImpressions } from "@/lib/media-metrics";
import {
  getQuantityUnitMode,
  isMobileSingleMedia,
  resolveMediaQuantity,
  resolveMonthlyPriceForUnits,
} from "@/lib/media-quantity";
import { lineSupplyWon } from "@/lib/admin-quote-calc";
import {
  buildQuoteWizardLineContext,
  type QuoteCampaignPeriodKey,
} from "@/lib/quote-wizard-pricing";
import type {
  PricingStrategy,
  PricingStrategyLineInput,
  QuoteCalculatorMedia,
  QuoteLineItem,
} from "@/lib/pricing/strategy-types";

export const QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE =
  "QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE";

export function assertQuoteCalculatorDisplayType(
  m: Pick<QuoteCalculatorMedia, "id" | "type" | "catalogChannel">,
): string {
  const type = m.type?.trim();
  if (!type) {
    throw new Error(
      `${QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE}: mediaId=${m.id} catalogChannel=${m.catalogChannel ?? "unknown"}`,
    );
  }
  return type;
}

function toMediaItemForQuote(m: QuoteCalculatorMedia): MediaItem {
  const type = assertQuoteCalculatorDisplayType(m);
  return {
    id: m.id,
    name: m.name,
    nameEn: m.name,
    location: m.location,
    locationEn: m.location,
    region: "",
    type: type as MediaItem["type"],
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

function lineImpressions(m: QuoteCalculatorMedia, campaignDays: number): number {
  const displayType = assertQuoteCalculatorDisplayType(m);
  const monthly =
    m.impressions ??
    (m.dailyFootfall != null && m.dailyFootfall > 0
      ? m.dailyFootfall * 30
      : resolveMonthlyImpressions({
          id: m.id,
          name: m.name,
          nameEn: m.name,
          location: m.location,
          locationEn: m.location,
          region: "",
          type: displayType as MediaItem["type"],
          price: m.price,
          lat: m.latitude ?? 0,
          lng: m.longitude ?? 0,
          dailyFootTraffic: m.dailyFootfall ?? 0,
          sampleImages: [],
        }));
  return Math.round(monthly * (campaignDays / 30));
}

export class FixedPeriodPricing implements PricingStrategy {
  calculateLine({ media: m, ctx }: PricingStrategyLineInput): QuoteLineItem {
    assertQuoteCalculatorDisplayType(m);

    const priceOptions = m.priceOptions ?? [];
    const mediaItem = toMediaItemForQuote(m);
    const {
      periodDays,
      monthFactor,
      useOptionPricing,
      campaignPeriod,
      campaignDays,
      selectionMap,
      poMap,
    } = ctx;

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
        campaignPeriod: campaignPeriod as QuoteCampaignPeriodKey,
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
      snap?.quantity != null ? resolveMediaQuantity(mediaItem, snap.quantity) : 1;

    if (snap && mode === "package" && (m.priceOptions?.length ?? 0) > 0) {
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

    if (isMobileSingleMedia(mediaItem) && snap?.quantity != null && qty > 1) {
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
  }
}
