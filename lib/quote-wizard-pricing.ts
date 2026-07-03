import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import { tryResolveExplicitPriceOptionBundleDays, quoteBundleProrationWon } from "@/lib/compare-quote";
import {
  catalogPriceFieldToPriceMan,
  catalogPriceFieldToWon,
  formatMediaPriceCompactWon,
  formatPricePeriodShortLabel,
  inferMediaPricePeriodFromPriceOption,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";

export type QuoteCampaignPeriodKey =
  | "2weeks"
  | "1month"
  | "3months"
  | "6months"
  | "12months";

/** 견적 위저드 캠페인 기간 — `months` 가 있으면 업계 관행(1개월=2×2주)으로 환산 */
export const QUOTE_CAMPAIGN_PERIOD_CONFIG: Record<
  QuoteCampaignPeriodKey,
  { days: number; months: number | null }
> = {
  "2weeks": { days: 14, months: null },
  "1month": { days: 30, months: 1 },
  "3months": { days: 90, months: 3 },
  "6months": { days: 180, months: 6 },
  "12months": { days: 360, months: 12 },
};

export function isQuoteCampaignPeriodKey(
  value: string,
): value is QuoteCampaignPeriodKey {
  return value in QUOTE_CAMPAIGN_PERIOD_CONFIG;
}

/** 견적 위저드 캠페인 기간 → 일수 */
export function quoteCampaignDaysFromPeriodKey(
  campaignPeriod: QuoteCampaignPeriodKey,
): number {
  const cfg = QUOTE_CAMPAIGN_PERIOD_CONFIG[campaignPeriod];
  if (cfg.months != null) return cfg.months * 30;
  return cfg.days;
}

/** 매체 단가 주기 → 견적 위저드 기본 캠페인 기간 */
export function pricePeriodToQuoteCampaignPeriod(
  pricePeriod: MediaPricePeriodKey,
): QuoteCampaignPeriodKey {
  switch (pricePeriod) {
    case "biweekly":
    case "week":
    case "day":
      return "2weeks";
    default:
      return "1month";
  }
}

export function inferQuoteCampaignPeriodFromMedia(
  media: MediaItem,
  priceOptionIndex = 0,
): QuoteCampaignPeriodKey {
  const opt = media.priceOptions?.[priceOptionIndex];
  return pricePeriodToQuoteCampaignPeriod(
    inferMediaPricePeriodFromPriceOption(opt, media.pricePeriod),
  );
}

export type QuoteWizardLineContext = {
  unitPriceMan: number;
  pricePeriod: MediaPricePeriodKey;
  campaignUnits: number;
  lineTotalMan: number;
  unitPeriodLabel: string;
  executionPeriodLabel: string;
  bundleDays: number | null;
  campaignDays: number;
  prorationLabel: string | null;
};

export function resolveQuoteMediaPricePeriod(
  media: MediaItem,
  priceOptionIndex: number,
  isNetwork: boolean,
): MediaPricePeriodKey {
  if (isNetwork) return "month";
  return inferMediaPricePeriodFromPriceOption(
    media.priceOptions?.[priceOptionIndex],
    media.pricePeriod,
  );
}

/** 캠페인 기간 × 매체 단가 주기 → 집행 회수 */
export function quoteCampaignUnits(
  campaignPeriod: QuoteCampaignPeriodKey,
  pricePeriod: MediaPricePeriodKey,
): number {
  const cfg = QUOTE_CAMPAIGN_PERIOD_CONFIG[campaignPeriod];

  if (cfg.months != null) {
    switch (pricePeriod) {
      case "biweekly":
        return cfg.months * 2;
      case "week":
        return cfg.months * 4;
      case "day":
        return cfg.months * 30;
      default:
        return cfg.months;
    }
  }

  switch (pricePeriod) {
    case "biweekly":
      return 1;
    case "week":
      return 2;
    case "day":
      return cfg.days;
    default:
      return 0.5;
  }
}

export function quoteLineTotalMan(
  unitPriceMan: number,
  campaignUnits: number,
): number {
  return Math.round(unitPriceMan * campaignUnits);
}

function formatCampaignUnitsDisplay(units: number): string {
  const rounded = Math.round(units * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

function buildExecutionPeriodLabel(opts: {
  isKo: boolean;
  campaignPeriod: QuoteCampaignPeriodKey;
  campaignPeriodLabel: string;
  pricePeriod: MediaPricePeriodKey;
  campaignUnits: number;
  unitPeriodLabel: string;
}): string {
  const {
    isKo,
    campaignPeriod,
    campaignPeriodLabel,
    pricePeriod,
    campaignUnits,
    unitPeriodLabel,
  } = opts;

  if (pricePeriod === "month") {
    if (campaignPeriod === "2weeks") {
      return isKo ? "2주 (0.5개월)" : "2 weeks (0.5 mo)";
    }
    return campaignPeriodLabel;
  }

  const unitsDisplay = formatCampaignUnitsDisplay(campaignUnits);

  if (
    pricePeriod === "biweekly" &&
    campaignPeriod === "2weeks" &&
    campaignUnits === 1
  ) {
    return isKo ? "2주 · 1회" : "2 weeks · 1×";
  }

  return isKo
    ? `${campaignPeriodLabel} · ${unitsDisplay}${unitPeriodLabel}`
    : `${campaignPeriodLabel} · ${unitsDisplay}× ${unitPeriodLabel}`;
}

function buildProrationLabel(opts: {
  isKo: boolean;
  unitPriceWon: number;
  unitPeriodLabel: string;
  campaignDays: number;
  bundleDays: number;
  lineTotalWon: number;
}): string | null {
  if (opts.campaignDays === opts.bundleDays) return null;
  const locale = opts.isKo ? "ko-KR" : "en-US";
  const fmt = (won: number) => formatMediaPriceCompactWon(won, locale);
  if (opts.isKo) {
    return `${fmt(opts.unitPriceWon)}/${opts.unitPeriodLabel} × ${opts.campaignDays}일÷${opts.bundleDays}일 ≈ ${fmt(opts.lineTotalWon)}`;
  }
  return `${fmt(opts.unitPriceWon)}/${opts.unitPeriodLabel} × ${opts.campaignDays}d÷${opts.bundleDays}d ≈ ${fmt(opts.lineTotalWon)}`;
}

export function buildQuoteWizardLineContext(
  media: MediaItem,
  opts: {
    isKo: boolean;
    campaignPeriod: QuoteCampaignPeriodKey;
    campaignPeriodLabel: string;
    priceOptionIndex: number;
    networkUnits?: number;
  },
): QuoteWizardLineContext {
  const isNw = media.catalogSource === "network";
  const poIdx = opts.priceOptionIndex;
  const priceOpt = !isNw ? media.priceOptions?.[poIdx] : undefined;
  const units = isNw ? opts.networkUnits ?? media.networkMinUnits ?? 1 : 0;

  const unitPriceMan = isNw
    ? catalogPriceFieldToPriceMan(computeNetworkMonthlyFromMediaItem(media, units))
    : priceOpt
      ? catalogPriceFieldToPriceMan(priceOpt.price)
      : catalogPriceFieldToPriceMan(media.price);

  const pricePeriod = resolveQuoteMediaPricePeriod(media, poIdx, isNw);
  const explicitBundleDays =
    priceOpt != null ? tryResolveExplicitPriceOptionBundleDays(priceOpt) : null;
  const campaignDays = quoteCampaignDaysFromPeriodKey(opts.campaignPeriod);

  let campaignUnits: number;
  let lineTotalMan: number;
  if (!isNw && priceOpt && explicitBundleDays != null) {
    campaignUnits = campaignDays / explicitBundleDays;
    const lineTotalWon = quoteBundleProrationWon(
      catalogPriceFieldToWon(priceOpt.price),
      campaignDays,
      explicitBundleDays,
    );
    lineTotalMan = lineTotalWon / 10_000;
  } else {
    campaignUnits = quoteCampaignUnits(opts.campaignPeriod, pricePeriod);
    lineTotalMan = quoteLineTotalMan(unitPriceMan, campaignUnits);
  }

  const locale = opts.isKo ? "ko" : "en";
  const unitPeriodLabel = formatPricePeriodShortLabel(pricePeriod, locale);
  const lineTotalWon = Math.round(lineTotalMan * 10_000);
  const unitPriceWon = isNw
    ? lineTotalWon
    : priceOpt
      ? catalogPriceFieldToWon(priceOpt.price)
      : catalogPriceFieldToWon(media.price);
  const bundleDays =
    !isNw && priceOpt && explicitBundleDays != null ? explicitBundleDays : null;
  const prorationLabel =
    bundleDays != null
      ? buildProrationLabel({
          isKo: opts.isKo,
          unitPriceWon,
          unitPeriodLabel,
          campaignDays,
          bundleDays,
          lineTotalWon,
        })
      : null;
  const executionPeriodLabel = buildExecutionPeriodLabel({
    isKo: opts.isKo,
    campaignPeriod: opts.campaignPeriod,
    campaignPeriodLabel: opts.campaignPeriodLabel,
    pricePeriod,
    campaignUnits,
    unitPeriodLabel,
  });

  return {
    unitPriceMan,
    pricePeriod,
    campaignUnits,
    lineTotalMan,
    unitPeriodLabel,
    executionPeriodLabel,
    bundleDays,
    campaignDays,
    prorationLabel,
  };
}
