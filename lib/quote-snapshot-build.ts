import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { isNetworkCatalogItem } from "@/lib/matching-network-helpers";
import {
  getQuantityUnitMode,
  isPerUnitGradePriceOptions,
  resolveMediaQuantity,
} from "@/lib/media-quantity";
import { formatPlannerQuantityLabel } from "@/lib/planner/planner-media-quantity";
import type { PlanCartItem, PlanCartOptionSelection } from "@/lib/plan-cart";
import {
  planCartEffectiveOptionSelections,
  resolveOptionSelectionMonthlyPriceWon,
} from "@/lib/plan-cart-option-selections";
import type { PlannerPeriodPricingContext } from "@/lib/planner/planner-media-quantity";
import {
  plannerMediaPeriodTotalWon,
  resolveQuoteCampaignPeriodForPricing,
} from "@/lib/planner/planner-media-quantity";
import { planCartLinePeriodTotalWon, planCartItemQuoteLineFromPeriod } from "@/lib/plan-cart-pricing";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";
import { packagePeriodToggleMeta } from "@/lib/quote-package-period-toggle";

export type BuildQuoteMediaSelectionInput = {
  media: MediaItem;
  isKo: boolean;
  priceOptionIndex: number;
  /** 네트워크·이동형 unit 모드 수량 — 생략 시 bounds default */
  units?: number;
  lineTotalWon: number;
  usePackagePeriod?: boolean;
  lineCampaignDays?: number;
};

/** 견적 제출·export용 매체 선택 스냅샷 (package/unit 모드 반영) */
export function buildQuoteMediaSelectionSnapshot(
  input: BuildQuoteMediaSelectionInput,
): QuoteMediaSelectionSnapshot {
  const { media: m, isKo, priceOptionIndex: poIdx } = input;
  const priceOpt = m.priceOptions?.[poIdx];
  const isNw = isNetworkCatalogItem(m);
  const quantity = resolveMediaQuantity(
    m,
    input.units ?? (isNw ? (m.networkMinUnits ?? 1) : undefined),
  );
  const priceOptionIndex =
    isPerUnitGradePriceOptions(m) || getQuantityUnitMode(m) === "package"
      ? poIdx
      : 0;

  return {
    mediaId: m.id,
    priceOptionIndex,
    quantity,
    quantityLabel: formatPlannerQuantityLabel(m, quantity, isKo, {
      [m.id]: priceOptionIndex,
    }),
    optionLabel: priceOpt?.label?.trim() ?? null,
    optionPriceWon: priceOpt
      ? catalogPriceFieldToWon(priceOpt.price)
      : catalogPriceFieldToWon(m.price),
    lineTotalWon: input.lineTotalWon,
    optionDescription: priceOpt?.description?.trim() ?? null,
    ...(input.usePackagePeriod
      ? {
          usePackagePeriod: true as const,
          lineCampaignDays: input.lineCampaignDays,
        }
      : {}),
  };
}

function planCartUsesExplicitOptionRows(item: PlanCartItem): boolean {
  return (
    (item.optionSelections?.length ?? 0) > 0 ||
    (item.gradeSelections?.length ?? 0) > 0
  );
}

/** 옵션 행 단위 기간 총액 — planCartLinePeriodTotalWon과 동일 partial/선형 규칙 */
export function quoteOptionSelectionPeriodTotalWon(
  media: MediaItem,
  selection: PlanCartOptionSelection,
  periodCtx: PlannerPeriodPricingContext,
  isKo = true,
): number {
  const campaignPeriod = resolveQuoteCampaignPeriodForPricing(periodCtx);
  if (campaignPeriod) {
    return plannerMediaPeriodTotalWon(media, {
      campaignPeriod,
      quantities: { [media.id]: selection.quantity },
      priceOptionIndex: { [media.id]: selection.priceOptionIndex },
      isKo,
    });
  }
  const months =
    periodCtx.months != null && periodCtx.months > 0
      ? periodCtx.months
      : periodCtx.weeks != null && periodCtx.weeks > 0
        ? (periodCtx.weeks * 7) / 30
        : 1;
  return Math.round(
    resolveOptionSelectionMonthlyPriceWon(media, selection) * months,
  );
}

/** plan cart 아이템 → 견적 mediaSelections (복수 옵션 행이면 배열 확장) */
export function buildQuoteMediaSelectionSnapshotsFromCartItem(input: {
  media: MediaItem;
  item: PlanCartItem;
  isKo: boolean;
  periodCtx: PlannerPeriodPricingContext;
}): QuoteMediaSelectionSnapshot[] {
  const { media: m, item, isKo, periodCtx } = input;
  const rows = planCartEffectiveOptionSelections(item, m);
  const usesMulti =
    planCartUsesExplicitOptionRows(item) && (rows?.length ?? 0) > 1;
  const campaignPeriod = resolveQuoteCampaignPeriodForPricing(periodCtx);

  if (!rows?.length || !usesMulti) {
    const poIdx = rows?.[0]?.priceOptionIndex ?? item.priceOptionIndex ?? 0;
    const units = rows?.[0]?.quantity ?? item.quantity;
    const quoteLine =
      campaignPeriod != null
        ? planCartItemQuoteLineFromPeriod(item, m, campaignPeriod, isKo)
        : item.usePackagePeriod === true && packagePeriodToggleMeta(m, poIdx)
          ? planCartItemQuoteLineFromPeriod(item, m, "30days", isKo)
          : { lineTotalWon: planCartLinePeriodTotalWon(item, m, periodCtx, isKo) };
    return [
      buildQuoteMediaSelectionSnapshot({
        media: m,
        isKo,
        priceOptionIndex: poIdx,
        units,
        lineTotalWon: quoteLine.lineTotalWon,
        usePackagePeriod: quoteLine.usePackagePeriod,
        lineCampaignDays: quoteLine.lineCampaignDays,
      }),
    ];
  }

  return rows.map((row) =>
    buildQuoteMediaSelectionSnapshot({
      media: m,
      isKo,
      priceOptionIndex: row.priceOptionIndex,
      units: row.quantity,
      lineTotalWon: quoteOptionSelectionPeriodTotalWon(m, row, periodCtx, isKo),
    }),
  );
}
