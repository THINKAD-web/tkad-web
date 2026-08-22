import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan, catalogPriceFieldToWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import { networkInventoryUnitSuffix } from "@/lib/media-network-types";
import {
  getMediaPackageOptions,
  getQuantityUnitMode,
  isMobileSingleMedia,
  isPerUnitGradePriceOptions,
  isQuantitySelectableMedia,
  resolveCatalogLineMonthlyPriceWon,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
  type MediaPackageOption,
  type MediaQuantityUnitMode,
} from "@/lib/media-quantity";
import { quotePeriodLookupKeyFromDays } from "@/lib/compare-quote";
import { PLANNER_PERIOD_OPTIONS } from "@/lib/planner-period";
import {
  buildQuoteWizardLineContext,
  isQuoteCampaignPeriodKey,
  type QuoteCampaignPeriodKey,
} from "@/lib/quote-wizard-pricing";

const PLANNER_PERIOD_MONTHS_TOL = 0.04;

export type PlannerPeriodPricingContext = {
  /** 플래너·plan cart — 월 단위 (2주 ≈ 14/30) */
  months?: number;
  /** AI recommend `preferredPeriodWeeks` */
  weeks?: number;
};

/** 플래너 선택 매체별 수량 — 미지정 시 `getQuantityBounds().default` */
export type CampaignMediaQuantities = Record<string, number>;

/** `priceOptions` 패키지 매체 — 옵션 인덱스 */
export type CampaignMediaPriceOptionIndex = Record<string, number>;

/** 플래너 포트폴리오 예산·노출 계산 컨텍스트 */
export type PlannerPortfolioPricing = {
  quantities?: CampaignMediaQuantities;
  priceOptionIndex?: CampaignMediaPriceOptionIndex;
  /**
   * 매체별 캠페인 기간 노출 (A-1b Wave 3) — 저장 스냅샷을 정본으로 표시할 때.
   *
   * 보고서 payload · 매체 기여도 · 상권 세분화가 각각 `calculatePlan` 을
   * 부르므로, 한 곳에서만 저장값을 쓰면 같은 문서 안에서 숫자가 어긋난다.
   * 세 경로가 공통으로 받는 `pricing` 에 실어 함께 넘긴다.
   */
  impressions?: Record<string, number>;
};

export function pruneCampaignMediaPriceOptionIndex(
  mediaIds: readonly string[],
  index: CampaignMediaPriceOptionIndex,
): CampaignMediaPriceOptionIndex {
  const next: CampaignMediaPriceOptionIndex = {};
  for (const id of mediaIds) {
    const i = index[id];
    if (i != null && Number.isFinite(i) && i >= 0) next[id] = Math.round(i);
  }
  return next;
}

export function plannerUnitsForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
): number {
  return resolveMediaQuantity(m, quantities?.[m.id]);
}

export function plannerMonthlyPriceWonForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  const poIdx = priceOptionIndex?.[m.id] ?? 0;
  return resolveCatalogLineMonthlyPriceWon(m, {
    priceOptionIndex: poIdx,
    units: quantities?.[m.id],
  });
}

export function plannerMonthlyPriceManForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  return catalogPriceFieldToPriceMan(
    plannerMonthlyPriceWonForMedia(m, quantities, priceOptionIndex),
  );
}

/** 플래너 기간(월) → 견적 캠페인 `periodKey` (운영 6일 단위, 정확 일치만) */
export function resolveQuoteCampaignPeriodFromPlannerMonths(
  months: number,
): QuoteCampaignPeriodKey | null {
  const preset = PLANNER_PERIOD_OPTIONS.find(
    (o) => Math.abs(months - o.months) < PLANNER_PERIOD_MONTHS_TOL,
  );
  if (preset?.id === "1w") return "7days";
  if (preset?.id === "1m") return "30days";
  const days = Math.max(1, Math.round(months * 30));
  const key = quotePeriodLookupKeyFromDays(days);
  return key != null && isQuoteCampaignPeriodKey(key) ? key : null;
}

/** recommend `preferredPeriodWeeks` → 견적 `periodKey` */
export function resolveQuoteCampaignPeriodFromWeeks(
  weeks: number,
): QuoteCampaignPeriodKey | null {
  const days = Math.max(1, Math.round(weeks * 7));
  const key = quotePeriodLookupKeyFromDays(days);
  if (key != null && isQuoteCampaignPeriodKey(key)) return key;
  return null;
}

export function resolveQuoteCampaignPeriodForPricing(
  ctx: PlannerPeriodPricingContext,
): QuoteCampaignPeriodKey | null {
  if (ctx.weeks != null && ctx.weeks > 0) {
    const fromWeeks = resolveQuoteCampaignPeriodFromWeeks(ctx.weeks);
    if (fromWeeks) return fromWeeks;
  }
  if (ctx.months != null && ctx.months > 0) {
    return resolveQuoteCampaignPeriodFromPlannerMonths(ctx.months);
  }
  return null;
}

/** 단일 매체 — 캠페인 기간 반영 line total(원). P1 `buildQuoteWizardLineContext` 공유 */
export function plannerMediaPeriodTotalWon(
  media: MediaItem,
  opts: {
    campaignPeriod: QuoteCampaignPeriodKey;
    quantities?: CampaignMediaQuantities;
    priceOptionIndex?: CampaignMediaPriceOptionIndex;
    isKo?: boolean;
  },
): number {
  const poIdx = opts.priceOptionIndex?.[media.id] ?? 0;
  const isNw = media.catalogSource === "network";
  const line = buildQuoteWizardLineContext(media, {
    isKo: opts.isKo ?? true,
    campaignPeriod: opts.campaignPeriod,
    campaignPeriodLabel: opts.campaignPeriod,
    priceOptionIndex: poIdx,
    mobileUnits: opts.quantities?.[media.id],
    networkUnits: isNw
      ? opts.quantities?.[media.id] ?? media.networkMinUnits ?? 1
      : undefined,
  });
  return Math.round(line.lineTotalMan * 10_000);
}

/** 단일 매체 — 캠페인 기간 반영 line total(원). partial rate 우선, 없으면 월×기간 선형 */
export function plannerMediaPeriodLineWon(
  media: MediaItem,
  ctx: PlannerPeriodPricingContext,
  pricing?: PlannerPortfolioPricing,
  isKo = true,
): number {
  const period = resolveQuoteCampaignPeriodForPricing(ctx);
  if (period) {
    return plannerMediaPeriodTotalWon(media, {
      campaignPeriod: period,
      quantities: pricing?.quantities,
      priceOptionIndex: pricing?.priceOptionIndex,
      isKo,
    });
  }
  const months =
    ctx.months != null && ctx.months > 0
      ? ctx.months
      : ctx.weeks != null && ctx.weeks > 0
        ? (ctx.weeks * 7) / 30
        : 1;
  return Math.round(
    plannerMonthlyPriceWonForMedia(
      media,
      pricing?.quantities,
      pricing?.priceOptionIndex,
    ) * months,
  );
}

/** 포트폴리오 기간 총액(원) — partial rate 우선, 없으면 월×개월 선형 */
export function plannerPortfolioPeriodTotalWon(
  portfolio: readonly MediaItem[],
  ctx: PlannerPeriodPricingContext,
  pricing?: PlannerPortfolioPricing,
  isKo = true,
): number {
  const period = resolveQuoteCampaignPeriodForPricing(ctx);
  if (period) {
    return portfolio.reduce(
      (sum, m) =>
        sum +
        plannerMediaPeriodTotalWon(m, {
          campaignPeriod: period,
          quantities: pricing?.quantities,
          priceOptionIndex: pricing?.priceOptionIndex,
          isKo,
        }),
      0,
    );
  }
  const months =
    ctx.months != null && ctx.months > 0
      ? ctx.months
      : ctx.weeks != null && ctx.weeks > 0
        ? (ctx.weeks * 7) / 30
        : 1;
  const monthly = portfolio.reduce(
    (s, m) =>
      s +
      plannerMonthlyPriceWonForMedia(
        m,
        pricing?.quantities,
        pricing?.priceOptionIndex,
      ),
    0,
  );
  return Math.round(monthly * months);
}

export function plannerMonthlyImpressionsForMedia(
  m: MediaItem,
  quantities?: CampaignMediaQuantities,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): number {
  void priceOptionIndex;
  return resolveImpressionsForUnits(m, quantities?.[m.id]);
}

export function pruneCampaignMediaQuantities(
  mediaIds: readonly string[],
  quantities: CampaignMediaQuantities,
): CampaignMediaQuantities {
  const next: CampaignMediaQuantities = {};
  for (const id of mediaIds) {
    const q = quantities[id];
    if (q != null && Number.isFinite(q) && q > 0) next[id] = Math.round(q);
  }
  return next;
}

export function plannerQuantityUnitMode(m: MediaItem): MediaQuantityUnitMode {
  return getQuantityUnitMode(m);
}

export function plannerPackageOptions(
  m: MediaItem,
  isKo: boolean,
): MediaPackageOption[] {
  return getMediaPackageOptions(m, isKo);
}

export function formatPlannerQuantityLabel(
  m: MediaItem,
  units: number,
  isKo: boolean,
  priceOptionIndex?: CampaignMediaPriceOptionIndex,
): string {
  if (isPerUnitGradePriceOptions(m)) {
    return isKo ? `${units.toLocaleString("ko-KR")}대` : `${units} units`;
  }
  if (getQuantityUnitMode(m) === "package") {
    if (isNetworkCatalogItem(m)) {
      const opt = getMediaPackageOptions(m, isKo).find((o) => o.units === units);
      if (opt) return opt.label.split(" · ")[0] ?? opt.label;
    } else {
      const idx = priceOptionIndex?.[m.id] ?? 0;
      const opt = m.priceOptions?.[idx];
      if (opt?.label) return opt.label;
    }
  }
  if (isNetworkCatalogItem(m)) {
    const suffix = networkInventoryUnitSuffix(
      m.networkSubtype ?? m.type,
      isKo,
      m.tags,
    );
    return isKo
      ? `${units.toLocaleString("ko-KR")}${suffix || "대"}`
      : `${units.toLocaleString("en-US")} units`;
  }
  if (isMobileSingleMedia(m)) {
    return isKo ? `${units}대` : `${units} units`;
  }
  if (m.type?.trim().toLowerCase() === "digital") {
    return isKo ? `${units}기` : `${units} units`;
  }
  return String(units);
}

export function shouldShowPlannerQuantityControl(m: MediaItem): boolean {
  if (!isQuantitySelectableMedia(m)) return false;
  if (getQuantityUnitMode(m) === "package") {
    return getMediaPackageOptions(m, true).length > 0;
  }
  return true;
}

/** 등급형 버스 — 대수 스텝퍼 노출 */
export function shouldShowGradeQuantityStepper(m: MediaItem): boolean {
  return isPerUnitGradePriceOptions(m);
}

/** @deprecated use shouldShowPlannerQuantityControl */
export function shouldShowPlannerQuantityStepper(m: MediaItem): boolean {
  if (!shouldShowPlannerQuantityControl(m)) return false;
  if (shouldShowGradeQuantityStepper(m)) return true;
  return getQuantityUnitMode(m) === "unit";
}

export function defaultPackageUnitsForMedia(m: MediaItem): number {
  const opts = getMediaPackageOptions(m, true);
  return opts[0]?.units ?? resolveMediaQuantity(m);
}

export function syncQuantityAfterPackagePick(
  m: MediaItem,
  option: MediaPackageOption,
): number {
  if (option.units != null && option.units > 0) return option.units;
  return resolveMediaQuantity(m);
}
