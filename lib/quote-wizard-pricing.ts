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
  partialRateLookupKeyFromDays,
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
  mediaPriceOnInquiryLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { isPricingUnavailable, hasOnlinePricingSpec, isOnlineCatalogMedia } from "@/lib/pricing-unavailable";

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
  /** type/price null 또는 단가 ≤0 — 숫자 라인·합계에서 제외, 「가격 문의」 표시 */
  priceOnInquiry: boolean;
};

/** 견적 위저드 — billable numeric line 가능 여부 (PR1b-2 safety net). */
export function isQuoteWizardPriceOnInquiry(
  media: MediaItem,
  opts?: {
    priceOptionIndex?: number;
    mobileUnits?: number;
    networkUnits?: number;
  },
): boolean {
  return isPricingUnavailable(media, opts);
}

export function sumQuoteWizardBillableMan(
  lines: readonly QuoteWizardLineContext[],
): {
  unitSumMan: number;
  totalMan: number;
  inquiryCount: number;
} {
  let unitSumMan = 0;
  let totalMan = 0;
  let inquiryCount = 0;
  for (const line of lines) {
    if (line.priceOnInquiry) {
      inquiryCount += 1;
      continue;
    }
    unitSumMan += line.unitPriceMan;
    totalMan += line.lineTotalMan;
  }
  return { unitSumMan, totalMan, inquiryCount };
}

export function formatQuoteWizardInquiryLabel(isKo: boolean): string {
  return mediaPriceOnInquiryLabel(isKo ? "ko" : "en");
}

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

/** 캠페인 일수 × 매체 단가 주기 → 집행 회수 (명시 일수 기준) */
export function quoteCampaignUnitsFromDays(
  campaignDays: number,
  pricePeriod: MediaPricePeriodKey,
): number {
  const days = Math.max(1, Math.round(campaignDays));
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

/** Online calculable rows — monthly budget line (not OOH period proration). */
export function shouldUseOnlineWizardBudgetLine(
  media: Pick<MediaItem, "catalogChannel" | "onlineSpec">,
): boolean {
  return isOnlineCatalogMedia(media) && hasOnlinePricingSpec(media);
}

export function defaultQuoteWizardOnlineBudgetWon(
  media: Pick<MediaItem, "onlineSpec">,
): number {
  return media.onlineSpec?.minBudget ?? 1_000_000;
}

export function isQuoteWizardOnlineBudgetBelowMin(
  media: Pick<MediaItem, "onlineSpec" | "catalogChannel">,
  budgetWon: number,
): boolean {
  const spec = media.onlineSpec;
  if (!spec || !hasOnlinePricingSpec(media)) return false;
  const minBudget = spec.minBudget ?? 0;
  return minBudget > 0 && budgetWon > 0 && budgetWon < minBudget;
}

/**
 * Client-side online quote line — must stay aligned with BudgetPricing + calculateQuote.
 * lineTotalMan × 10_000 === server lineSupplyWon for valid budgets.
 */
export function buildQuoteWizardOnlineLineContext(
  media: MediaItem,
  budgetWon: number,
  opts: {
    isKo: boolean;
    campaignPeriodLabel: string;
    campaignDays?: number;
  },
): QuoteWizardLineContext {
  const locale = opts.isKo ? "ko" : "en";
  const campaignDays = opts.campaignDays ?? 30;

  if (
    isQuoteWizardPriceOnInquiry(media) ||
    !shouldUseOnlineWizardBudgetLine(media) ||
    budgetWon <= 0 ||
    isQuoteWizardOnlineBudgetBelowMin(media, budgetWon)
  ) {
    return {
      unitPriceMan: 0,
      pricePeriod: "month",
      campaignUnits: 0,
      lineTotalMan: 0,
      unitPeriodLabel: formatPricePeriodShortLabel("month", locale),
      executionPeriodLabel: opts.isKo ? "월 예산" : "Monthly budget",
      bundleDays: null,
      campaignDays,
      prorationLabel: null,
      usesMediaPartialRate: false,
      priceOnInquiry: true,
    };
  }

  const lineTotalMan = Math.round(budgetWon / 10_000);
  return {
    unitPriceMan: lineTotalMan,
    pricePeriod: "month",
    campaignUnits: 1,
    lineTotalMan,
    unitPeriodLabel: opts.isKo ? "월 예산" : "Monthly budget",
    executionPeriodLabel: opts.isKo ? "월 예산 기준" : "Monthly budget basis",
    bundleDays: null,
    campaignDays,
    prorationLabel: null,
    usesMediaPartialRate: false,
    priceOnInquiry: false,
  };
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
    /** URL·캘린더에서 전달된 집행 일수 — period 프리셋보다 우선 */
    campaignDaysOverride?: number;
  },
): QuoteWizardLineContext {
  if (shouldUseOnlineWizardBudgetLine(media)) {
    return buildQuoteWizardOnlineLineContext(media, 0, {
      isKo: opts.isKo,
      campaignPeriodLabel: opts.campaignPeriodLabel,
      campaignDays:
        opts.campaignDaysOverride != null && opts.campaignDaysOverride > 0
          ? Math.round(opts.campaignDaysOverride)
          : quoteCampaignDaysFromPeriodKey(opts.campaignPeriod),
    });
  }
  const isNw = media.catalogSource === "network";
  const poIdx = opts.priceOptionIndex;
  const priceOpt = !isNw ? media.priceOptions?.[poIdx] : undefined;
  const units = isNw ? opts.networkUnits ?? media.networkMinUnits ?? 1 : 0;
  const locale = opts.isKo ? "ko" : "en";

  if (
    isQuoteWizardPriceOnInquiry(media, {
      priceOptionIndex: poIdx,
      mobileUnits: opts.mobileUnits,
      networkUnits: units,
    })
  ) {
    const pricePeriod = resolveQuoteMediaPricePeriod(media, poIdx, isNw);
    const globalCampaignDays =
      opts.campaignDaysOverride != null && opts.campaignDaysOverride > 0
        ? Math.round(opts.campaignDaysOverride)
        : quoteCampaignDaysFromPeriodKey(opts.campaignPeriod);
    return {
      unitPriceMan: 0,
      pricePeriod,
      campaignUnits: 0,
      lineTotalMan: 0,
      unitPeriodLabel: formatPricePeriodShortLabel(pricePeriod, locale),
      executionPeriodLabel: opts.campaignPeriodLabel,
      bundleDays: null,
      campaignDays: globalCampaignDays,
      prorationLabel: null,
      usesMediaPartialRate: false,
      priceOnInquiry: true,
    };
  }

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
  const globalCampaignDays =
    opts.campaignDaysOverride != null && opts.campaignDaysOverride > 0
      ? Math.round(opts.campaignDaysOverride)
      : quoteCampaignDaysFromPeriodKey(opts.campaignPeriod);
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

  const partialRateLookupKey =
    opts.campaignDaysOverride != null && opts.campaignDaysOverride > 0
      ? partialRateLookupKeyFromDays(globalCampaignDays)
      : opts.campaignPeriod;
  const partialRate =
    !isNw && !usePackagePeriod && partialRateLookupKey
      ? resolvePartialPeriodRate(
          media,
          priceOpt ?? null,
          partialRateLookupKey,
        )
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
    campaignUnits =
      opts.campaignDaysOverride != null && opts.campaignDaysOverride > 0
        ? quoteCampaignUnitsFromDays(campaignDays, pricePeriod)
        : quoteCampaignUnits(opts.campaignPeriod, pricePeriod);
    lineTotalMan = quoteLineTotalMan(unitPriceMan, campaignUnits);
  }

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
    priceOnInquiry: false,
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
  if (
    isQuoteWizardPriceOnInquiry(media, {
      priceOptionIndex: opts.priceOptionIndex,
      mobileUnits: opts.mobileUnits,
      networkUnits: opts.networkUnits,
    })
  ) {
    return 0;
  }
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
