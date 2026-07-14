import type { MediaItem, MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import {
  isPerUnitGradePriceOptions,
  resolveCatalogLineMonthlyPriceWon,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { tryResolveExplicitPriceOptionBundleDays, quoteBundleProrationWon } from "@/lib/compare-quote";
import {
  isPartialPeriodRateAdminKey,
  partialPeriodRateDaysFromKey,
  partialPeriodRateToPercentLabel,
  PARTIAL_PERIOD_RATE_DAYS,
  PARTIAL_PERIOD_RATE_KEYS,
  quoteLineTotalWonFromPartialRate,
  resolvePartialPeriodRate,
  type PartialPeriodRateAdminKey,
} from "@/lib/media-partial-period-rates";
import {
  catalogPriceFieldToPriceMan,
  catalogPriceFieldToWon,
  formatMediaPriceCompactWon,
  formatPricePeriodShortLabel,
  inferMediaPricePeriodFromPriceOption,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";

/** 견적 캠페인 기간 = 운영 부분기간 요율 키 (1/3/5/7/15/30일) */
export type QuoteCampaignPeriodKey = PartialPeriodRateAdminKey;

/** 견적 위저드 캠페인 기간 — 일수 기반 */
export const QUOTE_CAMPAIGN_PERIOD_CONFIG: Record<
  QuoteCampaignPeriodKey,
  { days: number; months: null }
> = Object.fromEntries(
  PARTIAL_PERIOD_RATE_KEYS.map((key) => [
    key,
    { days: PARTIAL_PERIOD_RATE_DAYS[key], months: null as null },
  ]),
) as Record<QuoteCampaignPeriodKey, { days: number; months: null }>;

export function isQuoteCampaignPeriodKey(
  value: string,
): value is QuoteCampaignPeriodKey {
  return isPartialPeriodRateAdminKey(value);
}

/** 견적 위저드 캠페인 기간 → 일수 */
export function quoteCampaignDaysFromPeriodKey(
  campaignPeriod: QuoteCampaignPeriodKey,
): number {
  return partialPeriodRateDaysFromKey(campaignPeriod);
}

/** UI 라벨용 — 예: ko "15일(15일)" */
export function formatQuoteCampaignPeriodWithDays(
  campaignPeriod: QuoteCampaignPeriodKey,
  periodLabel: string,
  isKo: boolean,
): string {
  const days = quoteCampaignDaysFromPeriodKey(campaignPeriod);
  return isKo ? `${periodLabel}(${days}일)` : `${periodLabel} (${days}d)`;
}

/** 매체 단가 주기 → 견적 위저드 기본 캠페인 기간 */
export function pricePeriodToQuoteCampaignPeriod(
  pricePeriod: MediaPricePeriodKey,
): QuoteCampaignPeriodKey {
  switch (pricePeriod) {
    case "day":
      return "1day";
    case "week":
      return "7days";
    case "biweekly":
      return "15days";
    default:
      return "30days";
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
  /** 매체·옵션에 설정된 부분기간 요율이 적용됨 */
  usesMediaPartialRate: boolean;
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
  const days = quoteCampaignDaysFromPeriodKey(campaignPeriod);
  switch (pricePeriod) {
    case "biweekly":
      return days / 14;
    case "week":
      return days / 7;
    case "day":
      return days;
    default:
      return days / 30;
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
  campaignPeriodLabel: string;
  pricePeriod: MediaPricePeriodKey;
  campaignUnits: number;
  unitPeriodLabel: string;
}): string {
  const { isKo, campaignPeriodLabel, pricePeriod, campaignUnits, unitPeriodLabel } =
    opts;

  if (pricePeriod === "month") {
    return campaignPeriodLabel;
  }

  const unitsDisplay = formatCampaignUnitsDisplay(campaignUnits);

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

function buildPartialPeriodRateLabel(opts: {
  isKo: boolean;
  unitPriceWon: number;
  unitPeriodLabel: string;
  rate: number;
  lineTotalWon: number;
}): string {
  const locale = opts.isKo ? "ko-KR" : "en-US";
  const fmt = (won: number) => formatMediaPriceCompactWon(won, locale);
  const pct = partialPeriodRateToPercentLabel(opts.rate);
  if (opts.isKo) {
    return `[매체 지정 요율] ${fmt(opts.unitPriceWon)}/${opts.unitPeriodLabel} × ${pct}% ≈ ${fmt(opts.lineTotalWon)}`;
  }
  return `[Media rate] ${fmt(opts.unitPriceWon)}/${opts.unitPeriodLabel} × ${pct}% ≈ ${fmt(opts.lineTotalWon)}`;
}

/** 패키지 기간 토글 on 시 행 집행 기간 라벨 (예: "1주", "3일") */
export function formatPackageExecutionPeriodLabel(
  priceOpt: MediaPriceOption | undefined,
  bundleDays: number,
  isKo: boolean,
): string {
  const period =
    typeof priceOpt?.period === "string" ? priceOpt.period.trim() : "";
  if (period) return period;
  return isKo ? `${bundleDays}일` : `${bundleDays}d`;
}

/** 캠페인 요약 — 라인별 집행 일수가 다르면 혼합 접미사 */
export function resolveQuoteCampaignPeriodSummaryLabel(opts: {
  campaignPeriodLabel: string;
  globalCampaignDays: number;
  lineCampaignDays: number[];
  isKo: boolean;
  mixedLabel: string;
}): string {
  const { campaignPeriodLabel, globalCampaignDays, lineCampaignDays, mixedLabel } =
    opts;
  if (lineCampaignDays.length === 0) return campaignPeriodLabel;
  const allGlobal = lineCampaignDays.every((d) => d === globalCampaignDays);
  if (allGlobal) return campaignPeriodLabel;
  return mixedLabel.replace("{period}", campaignPeriodLabel);
}

export function buildQuoteWizardLineContext(
  media: MediaItem,
  opts: {
    isKo: boolean;
    campaignPeriod: QuoteCampaignPeriodKey;
    campaignPeriodLabel: string;
    priceOptionIndex: number;
    networkUnits?: number;
    /** 이동형 단일 매체 대수 */
    mobileUnits?: number;
    /** true면 패키지 번들 기간만 집행 — proration 없음 */
    usePackagePeriod?: boolean;
  },
): QuoteWizardLineContext {
  const isNw = media.catalogSource === "network";
  const poIdx = opts.priceOptionIndex;
  const priceOpt = !isNw ? media.priceOptions?.[poIdx] : undefined;
  const units = isNw ? opts.networkUnits ?? media.networkMinUnits ?? 1 : 0;

  const unitPriceMan = isNw
    ? catalogPriceFieldToPriceMan(computeNetworkMonthlyFromMediaItem(media, units))
    : catalogPriceFieldToPriceMan(
        resolveCatalogLineMonthlyPriceWon(media, {
          priceOptionIndex: poIdx,
          units: opts.mobileUnits,
        }),
      );

  const pricePeriod = resolveQuoteMediaPricePeriod(media, poIdx, isNw);
  const explicitBundleDays =
    priceOpt != null ? tryResolveExplicitPriceOptionBundleDays(priceOpt) : null;
  const globalCampaignDays = quoteCampaignDaysFromPeriodKey(opts.campaignPeriod);
  const usePackagePeriod =
    opts.usePackagePeriod === true &&
    !isNw &&
    priceOpt != null &&
    explicitBundleDays != null &&
    !isPerUnitGradePriceOptions(media);
  const campaignDays = usePackagePeriod ? explicitBundleDays! : globalCampaignDays;

  const gradePerUnitWon =
    isPerUnitGradePriceOptions(media) && priceOpt
      ? catalogPriceFieldToWon(priceOpt.price) *
        resolveMediaQuantity(media, opts.mobileUnits)
      : null;

  const partialRate =
    !isNw && !usePackagePeriod
      ? resolvePartialPeriodRate(media, priceOpt ?? null, opts.campaignPeriod)
      : null;

  let usesMediaPartialRate = false;
  let campaignUnits: number;
  let lineTotalMan: number;

  if (partialRate != null) {
    const baseUnitWon =
      gradePerUnitWon ??
      (priceOpt
        ? catalogPriceFieldToWon(priceOpt.price)
        : catalogPriceFieldToWon(media.price));
    const lineTotalWon = quoteLineTotalWonFromPartialRate(
      baseUnitWon,
      partialRate,
    );
    campaignUnits = partialRate;
    lineTotalMan = lineTotalWon / 10_000;
    usesMediaPartialRate = true;
  } else if (
    !isNw &&
    priceOpt &&
    explicitBundleDays != null &&
    !isPerUnitGradePriceOptions(media)
  ) {
    if (usePackagePeriod) {
      campaignUnits = 1;
      lineTotalMan = unitPriceMan;
    } else {
      campaignUnits = campaignDays / explicitBundleDays;
      const lineTotalWon = quoteBundleProrationWon(
        catalogPriceFieldToWon(priceOpt.price),
        campaignDays,
        explicitBundleDays,
      );
      lineTotalMan = lineTotalWon / 10_000;
    }
  } else {
    campaignUnits = quoteCampaignUnits(opts.campaignPeriod, pricePeriod);
    lineTotalMan = quoteLineTotalMan(unitPriceMan, campaignUnits);
  }

  const locale = opts.isKo ? "ko" : "en";
  const unitPeriodLabel = formatPricePeriodShortLabel(pricePeriod, locale);
  const lineTotalWon = Math.round(lineTotalMan * 10_000);
  const unitPriceWon = isNw
    ? lineTotalWon
    : gradePerUnitWon != null
      ? gradePerUnitWon
      : priceOpt
        ? catalogPriceFieldToWon(priceOpt.price)
        : catalogPriceFieldToWon(media.price);
  const bundleDays =
    !isNw && priceOpt && explicitBundleDays != null ? explicitBundleDays : null;
  const prorationLabel = usePackagePeriod
    ? null
    : usesMediaPartialRate
      ? buildPartialPeriodRateLabel({
          isKo: opts.isKo,
          unitPriceWon,
          unitPeriodLabel,
          rate: partialRate!,
          lineTotalWon,
        })
      : bundleDays == null
        ? null
        : buildProrationLabel({
            isKo: opts.isKo,
            unitPriceWon,
            unitPeriodLabel,
            campaignDays,
            bundleDays,
            lineTotalWon,
          });
  const executionPeriodLabel =
    usePackagePeriod && bundleDays != null
      ? formatPackageExecutionPeriodLabel(priceOpt, bundleDays, opts.isKo)
      : buildExecutionPeriodLabel({
          isKo: opts.isKo,
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
    usesMediaPartialRate,
  };
}

/** 견적 카드 표시용 월액(만원) — `quoteLineContexts` 와 동일 입력 */
export function quoteCatalogDisplayPriceMan(
  media: MediaItem,
  opts: {
    priceOptionIndex: number;
    mobileUnits?: number;
    networkUnits?: number;
  },
): number {
  const isNw = media.catalogSource === "network";
  if (isNw) {
    const units = opts.networkUnits ?? media.networkMinUnits ?? 1;
    return catalogPriceFieldToPriceMan(
      computeNetworkMonthlyFromMediaItem(media, units),
    );
  }
  return catalogPriceFieldToPriceMan(
    resolveCatalogLineMonthlyPriceWon(media, {
      priceOptionIndex: opts.priceOptionIndex,
      units: opts.mobileUnits,
    }),
  );
}
